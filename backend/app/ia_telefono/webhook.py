import os
import requests
from flask import Blueprint, request, jsonify

from app.productos.models import Producto

ia_telefono_bp = Blueprint('ia_telefono_bp', __name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini")
NOMBRE_NEGOCIO = os.getenv("NOMBRE_PIZZERIA", "la pizzería")


def construir_menu_hablado():
    """
    Arma un texto legible del menú de pizzas (producto + tamaños + precios)
    usando el método que ya existe en el modelo Producto.
    """
    filas = Producto.obtener_menu()  # [(Producto, ProductoTamano), ...]

    menu_por_producto = {}
    for producto, producto_tamano in filas:
        if not producto.activo:
            continue
        menu_por_producto.setdefault(producto.nombre, [])
        nombre_tamano = producto_tamano.tamano.nombre
        precio = producto_tamano.precio
        menu_por_producto[producto.nombre].append(f"{nombre_tamano} a {precio} bolivianos")

    if not menu_por_producto:
        return "Por el momento no hay pizzas cargadas en el menú."

    lineas = []
    for nombre_producto, tamanos in menu_por_producto.items():
        lineas.append(f"- {nombre_producto}: " + ", ".join(tamanos))

    return "\n".join(lineas)


def construir_instrucciones():
    menu = construir_menu_hablado()
    return f"""
Eres la persona que contesta el teléfono en {NOMBRE_NEGOCIO}, una pizzería en Bolivia.
Responde en español, de forma breve, amable y natural, como lo haría un cajero real.

Tu única tarea por ahora es informar qué pizzas hay disponibles y sus precios
cuando el cliente pregunte. NO tomes pedidos todavía, NO prometas tiempos de
entrega, y NO inventes productos que no estén en esta lista.

Este es el menú vigente en este momento:
{menu}

Si el cliente quiere hacer un pedido, dile amablemente que por ahora solo
puedes informar el menú, y que para pedir debe llamar de nuevo más tarde
o acercarse al local.
""".strip()


@ia_telefono_bp.route("/ia/webhook", methods=["POST"])
def webhook():
    evento = request.get_json(silent=True) or {}
    tipo_evento = evento.get("type")
    print("Evento recibido de OpenAI:", tipo_evento)

    if tipo_evento == "realtime.call.incoming":
        call_id = evento["data"]["call_id"]
        instrucciones = construir_instrucciones()

        resp = requests.post(
            f"https://api.openai.com/v1/realtime/calls/{call_id}/accept",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "type": "realtime",
                "model": OPENAI_MODEL,
                "instructions": instrucciones,
                "voice": "alloy",
            },
            timeout=10,
        )
        print("Respuesta de accept:", resp.status_code, resp.text)

    return jsonify({"ok": True})