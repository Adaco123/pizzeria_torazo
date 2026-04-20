

from flask import Blueprint, make_response
from sqlalchemy.exc import SQLAlchemyError
from io import BytesIO
from datetime import datetime
import traceback

from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.db import db
from app.pedidos.models import Pedido, DetallePedido, DetalleMitad, DetalleMitadExtra
from app.productos.models import Producto
from app.combos.models import Combo, ComboProducto

ticket_cocina_bp = Blueprint("ticket_cocina_bp", __name__)

ANCHO_PAGINA = 58 * mm
MARGEN_H     = 2 * mm
ANCHO_UTIL   = ANCHO_PAGINA - 2 * MARGEN_H

NEGRO = colors.black


def _estilo(name, font="Courier", size=9, align=TA_LEFT,
            bold=False, italic=False,
            indent=0, space_before=0, space_after=1):
    """
    Crea un ParagraphStyle sin heredar fontName del parent,
    evitando el error 'multiple values for keyword argument fontName'.
    """
    if bold and italic:
        fn = "Courier-BoldOblique"
    elif bold:
        fn = "Courier-Bold"
    elif italic:
        fn = "Courier-Oblique"
    else:
        fn = font

    return ParagraphStyle(
        name,
        fontName=fn,
        fontSize=size,
        textColor=NEGRO,
        alignment=align,
        leftIndent=indent,
        spaceBefore=space_before,
        spaceAfter=space_after,
        wordWrap='CJK',
        leading=size * 1.3,
    )


def _estilos():
    return {
        "empresa":     _estilo("empresa",     size=14, bold=True,  align=TA_CENTER, space_after=1),
        "subtitulo":   _estilo("subtitulo",   size=8,              align=TA_CENTER, space_after=0),
        "num_pedido":  _estilo("num_pedido",  size=22, bold=True,  align=TA_CENTER, space_after=0),
        "fecha":       _estilo("fecha",       size=8,              align=TA_CENTER, space_after=0),
        "label_sec":   _estilo("label_sec",   size=8,  bold=True,  align=TA_CENTER, space_before=4, space_after=2),
        "nota_txt":    _estilo("nota_txt",    size=9,  bold=True, italic=True, indent=2, space_after=3),
        "item_cab":    _estilo("item_cab",    size=11, bold=True,  space_before=4, space_after=1),
        "item_info":   _estilo("item_info",   size=8,              indent=3, space_after=1),
        "extra":       _estilo("extra",       size=9,              indent=6, space_after=1),
        "nota_item":   _estilo("nota_item",   size=9,  italic=True,indent=6, space_after=2),
        "mitad_cab":   _estilo("mitad_cab",   size=10, bold=True,  indent=4, space_before=2, space_after=1),
        "mitad_extra": _estilo("mitad_extra", size=9,              indent=10, space_after=1),
        "pie":         _estilo("pie",         size=7,              align=TA_CENTER),
    }


def _linea_gruesa():
    return HRFlowable(width=ANCHO_UTIL, thickness=1.5, color=NEGRO,
                      spaceAfter=3, spaceBefore=3)

def _linea_fina():
    return HRFlowable(width=ANCHO_UTIL, thickness=0.5, color=NEGRO,
                      spaceAfter=3, spaceBefore=3)

def _linea_punteada():
    return HRFlowable(width=ANCHO_UTIL, thickness=0.5, color=NEGRO,
                      dash=(2, 3), spaceAfter=3, spaceBefore=3)


def _bloque_producto(idx, detalle, est, story):
    prod   = Producto.query.get(detalle.producto_id) if detalle.producto_id else None
    nombre = prod.nombre.upper() if prod else f"PRODUCTO #{detalle.producto_id}"
    tamano = detalle.tamano.nombre if detalle.tamano else None

    story.append(Paragraph(f"{idx}. {nombre}", est["item_cab"]))
    if tamano:
        story.append(Paragraph(f"Tamano: {tamano}", est["item_info"]))
    story.append(Paragraph(f"Cantidad: x{detalle.cantidad}", est["item_info"]))

    for extra in detalle.extras:
        ing    = extra.ingrediente.nombre if extra.ingrediente else f"Ing.#{extra.ingrediente_id}"
        cant_t = f" x{extra.cantidad}" if extra.cantidad > 1 else ""
        story.append(Paragraph(f"+ {ing}{cant_t}", est["extra"]))

    if detalle.notas and detalle.notas.strip():
        story.append(Paragraph(f"- {detalle.notas.strip()}", est["nota_item"]))


def _bloque_mitad(idx, detalle, est, story):
    tamano = detalle.tamano.nombre if detalle.tamano else None

    story.append(Paragraph(f"{idx}. PIZZA MITAD/MITAD", est["item_cab"]))
    if tamano:
        story.append(Paragraph(f"Tamano: {tamano}", est["item_info"]))
    story.append(Paragraph(f"Cantidad: x{detalle.cantidad}", est["item_info"]))

    for mitad_obj in sorted(detalle.mitades, key=lambda m: m.mitad):
        prod   = Producto.query.get(mitad_obj.producto_id)
        nombre = prod.nombre.upper() if prod else f"PROD.#{mitad_obj.producto_id}"
        story.append(Paragraph(f"-- Mitad {mitad_obj.mitad}: {nombre}", est["mitad_cab"]))
        for me in mitad_obj.extras:
            ing    = me.ingrediente.nombre if me.ingrediente else f"Ing.#{me.ingrediente_id}"
            cant_t = f" x{me.cantidad}" if me.cantidad > 1 else ""
            story.append(Paragraph(f"   + {ing}{cant_t}", est["mitad_extra"]))

    if detalle.notas and detalle.notas.strip():
        story.append(Paragraph(f"* {detalle.notas.strip()}", est["nota_item"]))


def _bloque_combo(idx, detalle, est, story):
    combo  = Combo.query.get(detalle.combo_id) if detalle.combo_id else None
    nombre = combo.nombre.upper() if combo else f"COMBO #{detalle.combo_id}"

    story.append(Paragraph(f"{idx}. {nombre} [COMBO]", est["item_cab"]))
    if detalle.tamano:
        story.append(Paragraph(f"Tamano: {detalle.tamano.nombre}", est["item_info"]))
    story.append(Paragraph(f"Cantidad: x{detalle.cantidad}", est["item_info"]))

    if combo:
        combo_prods = db.session.query(ComboProducto).filter_by(combo_id=combo.id).all()
        tamano_txt  = f" ({detalle.tamano.nombre})" if detalle.tamano else ""
        for cp in combo_prods:
            prod = Producto.query.get(cp.producto_id)
            if not prod:
                continue
            cant_t = f" x{cp.cantidad}" if cp.cantidad > 1 else ""
            story.append(Paragraph(f"  > {prod.nombre.upper()}{cant_t}{tamano_txt}", est["extra"]))

    if detalle.notas and detalle.notas.strip():
        story.append(Paragraph(f"* {detalle.notas.strip()}", est["nota_item"]))


def _generar_pdf(pedido: Pedido) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(ANCHO_PAGINA, 999 * mm),
        leftMargin=MARGEN_H,
        rightMargin=MARGEN_H,
        topMargin=3 * mm,
        bottomMargin=3 * mm,
    )

    est   = _estilos()
    story = []

    story.append(Paragraph("EL TORAZO", est["empresa"]))
    story.append(_linea_gruesa())

    num_mostrar = pedido.numero_turno if pedido.numero_turno else pedido.id
    story.append(Paragraph(f"PEDIDO #{num_mostrar}", est["num_pedido"]))
    fecha_str = pedido.fecha.strftime("%d/%m/%Y  %H:%M") if pedido.fecha else "--"
    story.append(Paragraph(fecha_str, est["fecha"]))
    story.append(_linea_fina())

    if pedido.direccion_entrega and pedido.direccion_entrega.strip():
        story.append(Paragraph("[ NOTA DEL PEDIDO ]", est["label_sec"]))
        story.append(Paragraph(pedido.direccion_entrega.strip(), est["nota_txt"]))
        story.append(_linea_fina())
    for idx, detalle in enumerate(pedido.detalles, start=1):
        story.append(_linea_punteada())
        if detalle.combo_id:
            _bloque_combo(idx, detalle, est, story)
        elif detalle.is_mitad:
            _bloque_mitad(idx, detalle, est, story)
        else:
            _bloque_producto(idx, detalle, est, story)

    story.append(_linea_gruesa())
    story.append(Paragraph(datetime.now().strftime("%d/%m/%Y %H:%M:%S"), est["pie"]))
    story.append(Spacer(1, 3 * mm))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


@ticket_cocina_bp.route(
    "/api/v1.0/pedidos/<int:pedido_id>/ticket-cocina",
    methods=["GET"]
)
def ticket_cocina(pedido_id: int):
    try:
        pedido = Pedido.query.get(pedido_id)
        if not pedido:
            return {"success": False, "error": "Pedido no encontrado"}, 404
        pdf_bytes = _generar_pdf(pedido)
        response  = make_response(pdf_bytes)
        response.headers["Content-Type"]        = "application/pdf"
        response.headers["Content-Disposition"] = (
            f'inline; filename="ticket-{pedido_id}.pdf"'
        )
        return response
    except SQLAlchemyError as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}, 500
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": f"Error generando PDF: {str(e)}"}, 500