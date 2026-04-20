
from app.movimientos.models import MovimientoStock
from flask import Blueprint, make_response
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError
from io import BytesIO
from datetime import datetime
import traceback

from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle

from app.db import db
from app.turnos.models import Turno
from app.pedidos.models import Pedido, DetallePedido
from app.factura.models import Factura
from app.pagos.models import Pago
from app.productos.models import Producto

resumen_turno_pdf_bp = Blueprint("resumen_turno_pdf_bp", __name__)

ANCHO_PAGINA = 58 * mm
MARGEN_H     = 2 * mm
ANCHO_UTIL   = ANCHO_PAGINA - 2 * MARGEN_H
NEGRO        = colors.black

def _estilo(name, size=9, align=TA_LEFT,
            bold=False, italic=False,
            indent=0, space_before=0, space_after=1):
    if bold and italic:
        fn = "Courier-BoldOblique"
    elif bold:
        fn = "Courier-Bold"
    elif italic:
        fn = "Courier-Oblique"
    else:
        fn = "Courier"

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
        "empresa":    _estilo("empresa",    size=14, bold=True,  align=TA_CENTER, space_after=1),
        "subtitulo":  _estilo("subtitulo",  size=8,              align=TA_CENTER, space_after=0),
        "turno_num":  _estilo("turno_num",  size=20, bold=True,  align=TA_CENTER, space_after=0),
        "meta":       _estilo("meta",       size=8,              align=TA_LEFT,   space_after=1),
        "sec_titulo": _estilo("sec_titulo", size=8,  bold=True,  align=TA_CENTER, space_before=3, space_after=2),
        "fila_etq":   _estilo("fila_etq",   size=9,              space_after=0),
        "fila_val":   _estilo("fila_val",   size=9,              align=TA_RIGHT,  space_after=0),
        "total_etq":  _estilo("total_etq",  size=10, bold=True,  space_after=0),
        "total_val":  _estilo("total_val",  size=10, bold=True,  align=TA_RIGHT,  space_after=0),
        "th":         _estilo("th",         size=7,  bold=True,  space_after=0),
        "td":         _estilo("td",         size=8,              space_after=0),
        "td_r":       _estilo("td_r",       size=8,              align=TA_RIGHT,  space_after=0),
        "td_c":       _estilo("td_c",       size=8,              align=TA_CENTER, space_after=0),
        "td_bold":    _estilo("td_bold",    size=8,  bold=True,  space_after=0),
        "td_bold_r":  _estilo("td_bold_r",  size=8,  bold=True,  align=TA_RIGHT,  space_after=0),
        "td_bold_c":  _estilo("td_bold_c",  size=8,  bold=True,  align=TA_CENTER, space_after=0),
        "badge_rojo": _estilo("badge_rojo", size=7,  bold=True,  align=TA_CENTER, space_after=0),
        "mov_hora":   _estilo("mov_hora",   size=7,              align=TA_CENTER, space_after=0),
        "pie":        _estilo("pie",        size=7,              align=TA_CENTER),
        "nota":       _estilo("nota",       size=7,  italic=True, align=TA_CENTER, space_after=1),
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

def _tabla(filas, col_widths, style_extra=None):
    t = Table(filas, colWidths=col_widths, hAlign='LEFT')
    base_style = [
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING',  (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING',   (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 1),
    ]
    if style_extra:
        base_style += style_extra
    t.setStyle(TableStyle(base_style))
    return t

def _fila_financiera(etiqueta, valor, est, negrita=False):
    ek = "total_etq" if negrita else "fila_etq"
    vk = "total_val" if negrita else "fila_val"
    return _tabla(
        [[Paragraph(etiqueta, est[ek]), Paragraph(valor, est[vk])]],
        col_widths=[ANCHO_UTIL * 0.60, ANCHO_UTIL * 0.40],
    )
def _tabla_productos(productos, est):
    C1 = ANCHO_UTIL * 0.44
    C2 = ANCHO_UTIL * 0.28
    C3 = ANCHO_UTIL * 0.28

    filas = [[
        Paragraph("Producto", est["th"]),
        Paragraph("Tam/Cant", est["th"]),
        Paragraph("Bs", est["th"]),
    ]]

    for prod in productos:
        for tamano, data in prod["tamanos"].items():
            filas.append([
                Paragraph(prod["nombre"], est["td"]),
                Paragraph(f'{tamano}\nx{data["cantidad"]}', est["td_c"]),
                Paragraph(f'{data["subtotal"]:.2f}', est["td_r"]),
            ])

    total_cant = sum(
        d["cantidad"]
        for p in productos
        for d in p["tamanos"].values()
    )
    total_bs = sum(
        d["subtotal"]
        for p in productos
        for d in p["tamanos"].values()
    )
    filas.append([
        Paragraph("TOTAL", est["td_bold"]),
        Paragraph(f"x{total_cant}", est["td_bold_c"]),
        Paragraph(f"{total_bs:.2f}", est["td_bold_r"]),
    ])

    return _tabla(filas, [C1, C2, C3], style_extra=[
        ('LINEBELOW',  (0, 0), (-1, 0), 0.5, NEGRO),
        ('LINEABOVE',  (0, -1), (-1, -1), 0.5, NEGRO),
    ])
def _tabla_combos(combos, est):
    C1 = ANCHO_UTIL * 0.55
    C2 = ANCHO_UTIL * 0.18
    C3 = ANCHO_UTIL * 0.27

    filas = [[
        Paragraph("Combo", est["th"]),
        Paragraph("Cant", est["th"]),
        Paragraph("Bs", est["th"]),
    ]]
    for c in combos:
        filas.append([
            Paragraph(c["nombre"], est["td"]),
            Paragraph(f'x{c["cantidad"]}', est["td_c"]),
            Paragraph(f'{c["subtotal"]:.2f}', est["td_r"]),
        ])

    total_cant = sum(c["cantidad"] for c in combos)
    total_bs   = sum(c["subtotal"] for c in combos)
    filas.append([
        Paragraph("TOTAL", est["td_bold"]),
        Paragraph(f"x{total_cant}", est["td_bold_c"]),
        Paragraph(f"{total_bs:.2f}", est["td_bold_r"]),
    ])
    return _tabla(filas, [C1, C2, C3], style_extra=[
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, NEGRO),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, NEGRO),
    ])
def _tabla_inventario(inventario, est):
    C1 = ANCHO_UTIL * 0.50
    C2 = ANCHO_UTIL * 0.25
    C3 = ANCHO_UTIL * 0.25

    filas = [[
        Paragraph("Bebida", est["th"]),
        Paragraph("Vend.", est["th"]),
        Paragraph("Stock", est["th"]),
    ]]
    for beb in inventario:
        stock = beb["stock_actual"]
        if stock == 0:
            stock_txt = "AGT"
            stock_est = est["badge_rojo"]
        elif stock <= 5:
            stock_txt = f"{stock}!"
            stock_est = est["td_bold_c"]
        else:
            stock_txt = str(stock)
            stock_est = est["td_c"]

        filas.append([
            Paragraph(beb["nombre"], est["td"]),
            Paragraph(str(beb["vendidas"]), est["td_c"]),
            Paragraph(stock_txt, stock_est),
        ])
    return _tabla(filas, [C1, C2, C3], style_extra=[
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, NEGRO),
    ])

def _tabla_movimientos(movimientos, est):
    C1 = ANCHO_UTIL * 0.38
    C2 = ANCHO_UTIL * 0.30
    C3 = ANCHO_UTIL * 0.14
    C4 = ANCHO_UTIL * 0.18

    filas = [[
        Paragraph("Producto", est["th"]),
        Paragraph("Cajero",   est["th"]),
        Paragraph("+",        est["th"]),
        Paragraph("Hora",     est["th"]),
    ]]
    for m in movimientos:
        hora = datetime.fromisoformat(m["fecha"]).strftime("%H:%M")
        filas.append([
            Paragraph(m["producto_nombre"], est["td"]),
            Paragraph(m["usuario_nombre"],  est["td"]),
            Paragraph(f'+{m["cantidad"]}',  est["td_bold_c"]),
            Paragraph(hora,                 est["mov_hora"]),
        ])
    return _tabla(filas, [C1, C2, C3, C4], style_extra=[
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, NEGRO),
    ])

def _tabla_extras(extras, est):
    C1 = ANCHO_UTIL * 0.55
    C2 = ANCHO_UTIL * 0.18
    C3 = ANCHO_UTIL * 0.27

    filas = [[
        Paragraph("Ingrediente", est["th"]),
        Paragraph("Cant",        est["th"]),
        Paragraph("Bs",          est["th"]),
    ]]
    for ex in extras[:5]:   # top 5
        filas.append([
            Paragraph(ex["nombre"],          est["td"]),
            Paragraph(str(ex["cantidad"]),   est["td_c"]),
            Paragraph(f'{ex["ingreso"]:.2f}',est["td_r"]),
        ])
    return _tabla(filas, [C1, C2, C3], style_extra=[
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, NEGRO),
    ])

def _tabla_metodos_pago(pagos_por_metodo, est):
    C1 = ANCHO_UTIL * 0.45
    C2 = ANCHO_UTIL * 0.20
    C3 = ANCHO_UTIL * 0.35

    filas = [[
        Paragraph("Método",  est["th"]),
        Paragraph("Pagos",   est["th"]),
        Paragraph("Bs",      est["th"]),
    ]]

    total_cantidad = 0
    total_monto    = 0.0

    for metodo, info in pagos_por_metodo.items():
        filas.append([
            Paragraph(metodo,                    est["td"]),
            Paragraph(str(info["cantidad"]),     est["td_c"]),
            Paragraph(f'{info["total"]:.2f}',   est["td_r"]),
        ])
        total_cantidad += info["cantidad"]
        total_monto    += info["total"]

    filas.append([
        Paragraph("TOTAL",              est["td_bold"]),
        Paragraph(str(total_cantidad),  est["td_bold_c"]),
        Paragraph(f'{total_monto:.2f}', est["td_bold_r"]),
    ])

    return _tabla(filas, [C1, C2, C3], style_extra=[
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, NEGRO),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, NEGRO),
    ])


def _recolectar_datos(turno):
    pedidos = Pedido.query.filter_by(turno_id=turno.id).all()
    pedidos_activos = [p for p in pedidos if p.estado.nombre != 'cancelado']

    facturas = Factura.query.filter(
        Factura.pedido_id.in_([p.id for p in pedidos_activos]),
        Factura.anulada == False
    ).all()

    total_vendido  = sum(f.total    for f in facturas)
    total_subtotal = sum(f.subtotal for f in facturas)
    total_impuesto = sum(f.impuesto for f in facturas)

    pagos_por_metodo = {}
    for f in facturas:
        for pago in f.pagos:
            metodo = pago.metodo.nombre if pago.metodo else "Sin especificar"
            if metodo not in pagos_por_metodo:
                pagos_por_metodo[metodo] = {"cantidad": 0, "total": 0.0}
            pagos_por_metodo[metodo]["cantidad"] += 1
            pagos_por_metodo[metodo]["total"]    += pago.monto

    ventas_productos = {}
    combos_vendidos  = {}

    for pedido in pedidos_activos:
        for detalle in pedido.detalles:
            if detalle.combo_id:
                cid = detalle.combo_id
                if cid not in combos_vendidos:
                    nombre = detalle.combo.nombre if detalle.combo else f"Combo {cid}"
                    combos_vendidos[cid] = {"combo_id": cid, "nombre": nombre,
                                            "cantidad": 0, "subtotal": 0.0}
                combos_vendidos[cid]["cantidad"] += detalle.cantidad
                combos_vendidos[cid]["subtotal"] += detalle.subtotal
                continue

            if detalle.is_mitad:
                for mitad in detalle.mitades:
                    pid = mitad.producto_id
                    if pid not in ventas_productos:
                        ventas_productos[pid] = {
                            "producto_id": pid,
                            "nombre":    mitad.producto.nombre if mitad.producto else f"Prod {pid}",
                            "categoria": mitad.producto.categoria.nombre if mitad.producto else "",
                            "tamanos":   {}
                        }
                    key = f'{detalle.tamano.nombre if detalle.tamano else "S/T"} (mitad)'
                    if key not in ventas_productos[pid]["tamanos"]:
                        ventas_productos[pid]["tamanos"][key] = {"cantidad": 0, "subtotal": 0}
                    ventas_productos[pid]["tamanos"][key]["cantidad"] += detalle.cantidad
                    ventas_productos[pid]["tamanos"][key]["subtotal"] += round(detalle.subtotal / 2, 2)

            elif detalle.producto_id:
                pid = detalle.producto_id
                if pid not in ventas_productos:
                    ventas_productos[pid] = {
                        "producto_id": pid,
                        "nombre":    detalle.producto.nombre if detalle.producto else f"Prod {pid}",
                        "categoria": detalle.producto.categoria.nombre if detalle.producto else "",
                        "tamanos":   {}
                    }
                key = detalle.tamano.nombre if detalle.tamano else "Sin tamano"
                if key not in ventas_productos[pid]["tamanos"]:
                    ventas_productos[pid]["tamanos"][key] = {"cantidad": 0, "subtotal": 0}
                ventas_productos[pid]["tamanos"][key]["cantidad"] += detalle.cantidad
                ventas_productos[pid]["tamanos"][key]["subtotal"] += detalle.subtotal

    pizzas  = [v for v in ventas_productos.values() if v["categoria"].lower() == "pizzas"]
    bebidas = [v for v in ventas_productos.values() if v["categoria"].lower() == "bebidas"]
    otros   = [v for v in ventas_productos.values()
               if v["categoria"].lower() not in ("pizzas", "bebidas")]
    combos  = sorted(combos_vendidos.values(), key=lambda x: x["subtotal"], reverse=True)

    inventario_bebidas = []
    for prod in Producto.query.filter_by(activo=True).all():
        if prod.categoria.nombre.lower() != "bebidas":
            continue
        vendidas = sum(
            t["cantidad"]
            for v in bebidas
            if v["producto_id"] == prod.id
            for t in v["tamanos"].values()
        )
        inventario_bebidas.append({
            "producto_id":  prod.id,
            "nombre":       prod.nombre,
            "vendidas":     vendidas,
            "stock_actual": prod.stock if prod.stock is not None else 0,
        })

    movimientos_lista = []
    try:
        movs = (MovimientoStock.query
                .filter_by(turno_id=turno.id)
                .order_by(MovimientoStock.fecha.asc())
                .all())
        movimientos_lista = [
            {
                "id":              m.id,
                "producto_nombre": m.producto.nombre if m.producto else "—",
                "usuario_nombre":  m.usuario.nombre  if m.usuario  else "—",
                "cantidad":        m.cantidad,
                "stock_anterior":  m.stock_anterior,
                "stock_nuevo":     m.stock_nuevo,
                "fecha":           m.fecha.isoformat(),
            }
            for m in movs
        ]
    except Exception:
        pass

    extras_ingredientes = {}
    for pedido in pedidos_activos:
        for detalle in pedido.detalles:
            for extra in detalle.extras:
                iid = extra.ingrediente_id
                if iid not in extras_ingredientes:
                    nombre = extra.ingrediente.nombre if extra.ingrediente else f"Ing.{iid}"
                    extras_ingredientes[iid] = {"nombre": nombre, "cantidad": 0, "ingreso": 0.0}
                extras_ingredientes[iid]["cantidad"] += extra.cantidad
                extras_ingredientes[iid]["ingreso"]  += round(extra.cantidad * extra.precio_extra, 2)

    top_extras = sorted(extras_ingredientes.values(), key=lambda x: x["ingreso"], reverse=True)

    return {
        "total_pedidos":      len(pedidos_activos),
        "total_facturas":     len(facturas),
        "total_subtotal":     round(total_subtotal, 2),
        "total_impuesto":     round(total_impuesto, 2),
        "total_vendido":      round(total_vendido,  2),
        "pizzas":             pizzas,
        "bebidas":            bebidas,
        "otros":              otros,
        "combos":             combos,
        "inventario_bebidas": inventario_bebidas,
        "movimientos_stock":  movimientos_lista,
        "top_extras":         top_extras,
        "pagos_por_metodo":   pagos_por_metodo,   # ← NUEVO
    }

def _generar_pdf(turno: Turno) -> bytes:
    datos = _recolectar_datos(turno)
    est   = _estilos()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(ANCHO_PAGINA, 999 * mm),
        leftMargin=MARGEN_H,
        rightMargin=MARGEN_H,
        topMargin=3 * mm,
        bottomMargin=3 * mm,
    )

    story = []

    story.append(Paragraph("PIZZERIA EL TORAZO", est["empresa"]))
    story.append(Paragraph("CIERRE DE TURNO", est["subtitulo"]))
    story.append(_linea_gruesa())

    story.append(Paragraph(f"TURNO #{turno.id}", est["turno_num"]))
    story.append(Spacer(1, 1 * mm))

    apertura = turno.apertura.strftime("%d/%m/%Y %H:%M") if turno.apertura else "--"
    cierre   = turno.cierre.strftime("%d/%m/%Y %H:%M")   if turno.cierre   else "En curso"
    cajero   = turno.usuario.nombre if turno.usuario else "--"

    story.append(Paragraph(f"Cajero  : {cajero}", est["meta"]))
    story.append(Paragraph(f"Apertura: {apertura}", est["meta"]))
    story.append(Paragraph(f"Cierre  : {cierre}",   est["meta"]))

    story.append(_linea_fina())

    story.append(Paragraph("-- RESUMEN FINANCIERO --", est["sec_titulo"]))
    story.append(_fila_financiera("Monto inicial",     f'Bs {turno.monto_inicio:.2f}',        est))
    story.append(_fila_financiera("Pedidos atendidos", str(datos["total_pedidos"]),            est))
    story.append(_fila_financiera("Facturas emitidas", str(datos["total_facturas"]),           est))
    story.append(_fila_financiera("Subtotal",          f'Bs {datos["total_subtotal"]:.2f}',   est))
    story.append(_fila_financiera("IVA (16%)",         f'Bs {datos["total_impuesto"]:.2f}',   est))
    story.append(_linea_punteada())
    story.append(_fila_financiera("TOTAL VENDIDO",     f'Bs {datos["total_vendido"]:.2f}',    est, negrita=True))

    if datos["pagos_por_metodo"]:
        story.append(_linea_punteada())
        story.append(Paragraph("-- METODOS DE PAGO --", est["sec_titulo"]))
        story.append(_tabla_metodos_pago(datos["pagos_por_metodo"], est))

    if turno.monto_cierre is not None:
        story.append(_linea_punteada())
        diferencia = turno.monto_cierre - turno.monto_inicio - datos["total_vendido"]
        story.append(_fila_financiera("Monto cierre", f'Bs {turno.monto_cierre:.2f}', est))
        story.append(_fila_financiera("Diferencia",   f'Bs {diferencia:.2f}',         est, negrita=True))

    story.append(_linea_fina())

    if datos["pizzas"]:
        story.append(Paragraph("-- PIZZAS VENDIDAS --", est["sec_titulo"]))
        story.append(_tabla_productos(datos["pizzas"], est))
        story.append(_linea_punteada())

    if datos["bebidas"]:
        story.append(Paragraph("-- BEBIDAS VENDIDAS --", est["sec_titulo"]))
        story.append(_tabla_productos(datos["bebidas"], est))
        story.append(_linea_punteada())

    if datos["combos"]:
        story.append(Paragraph("-- COMBOS VENDIDOS --", est["sec_titulo"]))
        story.append(_tabla_combos(datos["combos"], est))
        story.append(_linea_punteada())

    if datos["otros"]:
        story.append(Paragraph("-- OTROS PRODUCTOS --", est["sec_titulo"]))
        story.append(_tabla_productos(datos["otros"], est))
        story.append(_linea_punteada())

    if datos["inventario_bebidas"]:
        story.append(Paragraph("-- INVENTARIO BEBIDAS --", est["sec_titulo"]))
        story.append(_tabla_inventario(datos["inventario_bebidas"], est))
        story.append(_linea_punteada())

    if datos["movimientos_stock"]:
        story.append(Paragraph("-- REPOSICIONES DE STOCK --", est["sec_titulo"]))
        story.append(_tabla_movimientos(datos["movimientos_stock"], est))
        story.append(Paragraph("Stock final actualizado en inventario", est["nota"]))
        story.append(_linea_punteada())

    if datos["top_extras"]:
        story.append(Paragraph("-- EXTRAS MAS PEDIDOS --", est["sec_titulo"]))
        story.append(_tabla_extras(datos["top_extras"], est))
        story.append(_linea_punteada())

    story.append(_linea_gruesa())
    story.append(Paragraph(
        f'Generado: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}',
        est["pie"]
    ))
    story.append(Paragraph("*** Gracias ***", est["pie"]))
    story.append(Spacer(1, 3 * mm))
    doc.build(story)
    buffer.seek(0)
    return buffer.read()
@resumen_turno_pdf_bp.route(
    "/api/v1.0/turnos/<int:turno_id>/resumen-pdf",
    methods=["GET"]
)
@jwt_required()
def resumen_turno_pdf(turno_id: int):
    try:
        turno = Turno.query.get(turno_id)
        if not turno:
            return {"success": False, "error": "Turno no encontrado"}, 404

        pdf_bytes = _generar_pdf(turno)
        response  = make_response(pdf_bytes)
        response.headers["Content-Type"]        = "application/pdf"
        response.headers["Content-Disposition"] = (
            f'inline; filename="resumen-turno-{turno_id}.pdf"'
        )
        return response

    except SQLAlchemyError as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}, 500
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": f"Error generando PDF: {str(e)}"}, 500