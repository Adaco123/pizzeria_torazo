"""Ticket del cliente: ficha, productos con precios, total y como pago (58 mm)."""
import traceback
from io import BytesIO

from flask import Blueprint, make_response
from flask_jwt_extended import jwt_required
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.combos.models import Combo
from app.factura.models import Factura
from app.pedidos.api_v1_0.ticket_cocina import (
    ANCHO_PAGINA, ANCHO_UTIL, MARGEN_H, _estilo, _estilos, _linea_fina, _linea_gruesa, _linea_punteada,
)
from app.pedidos.models import Pedido
from app.pedidos.servicio import (
    ROL_ADMINISTRADOR, ROL_CAJERO, ReglaNegocio, estado_de, exigir_acceso_pedido, exigir_rol,
)
from app.productos.models import Producto

ticket_cliente_bp = Blueprint("ticket_cliente_bp", __name__)

COL_DESC = ANCHO_UTIL - 17 * mm
COL_IMPORTE = 17 * mm


def _bs(valor):
    return f"{valor:.2f}"


def _fila(texto, importe, est_texto, est_importe):
    return [Paragraph(texto, est_texto), Paragraph(importe, est_importe)]


def _nombre_detalle(detalle):
    if detalle.combo_id:
        combo = Combo.query.get(detalle.combo_id)
        return (combo.nombre if combo else f"Combo #{detalle.combo_id}") + " (combo)"
    if detalle.is_mitad:
        nombres = []
        for mitad in sorted(detalle.mitades, key=lambda m: m.mitad):
            producto = Producto.query.get(mitad.producto_id)
            nombres.append(producto.nombre if producto else f"#{mitad.producto_id}")
        return "Mitad y mitad: " + " / ".join(nombres)
    producto = Producto.query.get(detalle.producto_id) if detalle.producto_id else None
    return producto.nombre if producto else f"Producto #{detalle.producto_id}"


def _generar_pdf(pedido: Pedido) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=(ANCHO_PAGINA, 999 * mm),
        leftMargin=MARGEN_H, rightMargin=MARGEN_H, topMargin=3 * mm, bottomMargin=3 * mm,
    )
    est = _estilos()
    texto = _estilo("tk_texto", size=8)
    detalle_txt = _estilo("tk_detalle", size=7, indent=3)
    importe = _estilo("tk_importe", size=8, align=TA_RIGHT)
    total_txt = _estilo("tk_total", size=11, bold=True)
    total_imp = _estilo("tk_total_imp", size=11, bold=True, align=TA_RIGHT)
    centro = _estilo("tk_centro", size=8, align=TA_CENTER)

    story = [Paragraph("EL TORAZO", est["empresa"]), _linea_gruesa()]
    ficha = pedido.numero_turno if pedido.numero_turno else pedido.id
    story.append(Paragraph(f"FICHA #{ficha}", est["num_pedido"]))
    if pedido.fecha:
        story.append(Paragraph(pedido.fecha.strftime("%d/%m/%Y  %H:%M"), est["fecha"]))
    entrega = pedido.tipo_entrega.nombre if pedido.tipo_entrega else ""
    cliente = pedido.cliente.nombre if pedido.cliente else ""
    story.append(Paragraph(f"{entrega} - {cliente}", centro))
    story.append(_linea_fina())

    filas = []
    for detalle in pedido.detalles:
        nombre = _nombre_detalle(detalle)
        tamano = f" ({detalle.tamano.nombre})" if detalle.tamano else ""
        filas.append(_fila(f"{detalle.cantidad} x {nombre}{tamano}", _bs(detalle.subtotal), texto, importe))
        extras = list(detalle.extras)
        for mitad in detalle.mitades if detalle.is_mitad else []:
            extras.extend(mitad.extras)
        for extra in extras:
            ing = extra.ingrediente.nombre if extra.ingrediente else f"Ing.#{extra.ingrediente_id}"
            veces = f" x{extra.cantidad}" if extra.cantidad > 1 else ""
            filas.append(_fila(f"+ {ing}{veces}", "", detalle_txt, importe))
    if (pedido.descuento or 0) > 0:
        motivo = f" ({pedido.descuento_motivo})" if pedido.descuento_motivo else ""
        filas.append(_fila(f"Descuento{motivo}", "-" + _bs(pedido.descuento), texto, importe))
    if pedido.envio_cobrado > 0:
        quien = f" ({pedido.repartidor.nombre})" if pedido.repartidor else ""
        filas.append(_fila(f"Envío{quien}", _bs(pedido.envio_cobrado), texto, importe))
    if filas:
        tabla = Table(filas, colWidths=[COL_DESC, COL_IMPORTE])
        tabla.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(tabla)

    story.append(_linea_punteada())
    total = Table([_fila("TOTAL Bs", _bs(pedido.total), total_txt, total_imp)],
                  colWidths=[COL_DESC, COL_IMPORTE])
    total.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(total)

    pagos = [p for p in pedido.pagos if p.monto > 0]
    if pagos:
        story.append(_linea_fina())
        for pago in pagos:
            metodo = pago.metodo.nombre if pago.metodo else "Pago"
            story.append(Paragraph(f"{metodo}: Bs {_bs(pago.monto)}", texto))
            if pago.monto_recibido is not None and pago.monto_recibido > pago.monto:
                story.append(Paragraph(
                    f"Recibido {_bs(pago.monto_recibido)}  Vuelto {_bs(pago.monto_recibido - pago.monto)}",
                    detalle_txt))

    factura = Factura.query.filter_by(pedido_id=pedido.id, anulada=False).first()
    if factura:
        story.append(Paragraph(f"Factura: {factura.numero_factura}", texto))

    story.append(_linea_gruesa())
    story.append(Paragraph("*** Gracias ***", est["pie"]))
    story.append(Spacer(1, 3 * mm))
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


@ticket_cliente_bp.route("/api/v1.0/pedidos/<int:pedido_id>/ticket-cliente", methods=["GET"])
@jwt_required()
def ticket_cliente(pedido_id: int):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return {"success": False, "error": "Pedido no encontrado"}, 404
    try:
        # La cocina no ve precios: el ticket del cliente es del cajero y del administrador.
        exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
        exigir_acceso_pedido(pedido)
        if estado_de(pedido) == "pendiente":
            raise ReglaNegocio("Cobra el pedido antes de imprimir el ticket del cliente", 409)
    except ReglaNegocio as error:
        return {"success": False, "error": error.mensaje}, error.status
    try:
        respuesta = make_response(_generar_pdf(pedido))
        respuesta.headers["Content-Type"] = "application/pdf"
        respuesta.headers["Content-Disposition"] = f'inline; filename="ticket-cliente-{pedido_id}.pdf"'
        return respuesta
    except Exception as error:
        traceback.print_exc()
        return {"success": False, "error": f"Error generando PDF: {error}"}, 500
