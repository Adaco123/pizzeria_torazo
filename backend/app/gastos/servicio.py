"""Gastos y retiros de efectivo durante un turno."""
from datetime import datetime

from app.db import db
from app.gastos.models import CATEGORIAS_GASTO, GastoCaja
from app.pedidos.servicio import (
    ReglaNegocio, es_admin, exigir_acceso_turno, exigir_rol, usuario_actual,
)
from app.users.models import ROL_ADMINISTRADOR, ROL_CAJERO

TOPE_CAJERO_POR_TURNO = 100     # Bs que un cajero puede sacar de la caja en un turno
MAX_GASTO = 100000


def exigir_turno_abierto(turno):
    if turno.cierre is not None:
        raise ReglaNegocio('El turno está cerrado: ya no se pueden registrar ni anular gastos', 409)


def gastos_vigentes(turno):
    return [g for g in turno.gastos if not g.anulado]


def total_gastos(turno):
    return round(sum(g.monto for g in gastos_vigentes(turno)), 2)


def a_json(gasto):
    return {
        'id': gasto.id,
        'turno_id': gasto.turno_id,
        'fecha': gasto.fecha.isoformat(),
        'monto': round(gasto.monto, 2),
        'categoria': gasto.categoria,
        'categoria_nombre': CATEGORIAS_GASTO.get(gasto.categoria, gasto.categoria),
        'descripcion': gasto.descripcion,
        'usuario': gasto.usuario.nombre if gasto.usuario else None,
        'anulado': gasto.anulado,
        'anulado_por': gasto.anulado_por.nombre if gasto.anulado_por else None,
    }


def resumen_de_gastos(turno):
    """Total y desglose por categoría de lo que salió de la caja en el turno."""
    por_categoria = {}
    for g in gastos_vigentes(turno):
        fila = por_categoria.setdefault(g.categoria, {
            'categoria': g.categoria, 'nombre': CATEGORIAS_GASTO.get(g.categoria, g.categoria),
            'cantidad': 0, 'total': 0.0})
        fila['cantidad'] += 1
        fila['total'] += g.monto
    return {
        'total': total_gastos(turno),
        'cantidad': len(gastos_vigentes(turno)),
        'por_categoria': [{**f, 'total': round(f['total'], 2)}
                          for f in sorted(por_categoria.values(), key=lambda f: -f['total'])],
    }


def registrar_gasto(turno, categoria, monto, descripcion):
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_turno(turno)
    exigir_turno_abierto(turno)
    if categoria not in CATEGORIAS_GASTO:
        raise ReglaNegocio('Elige el tipo de gasto', 400)
    if isinstance(monto, bool) or not isinstance(monto, (int, float)) or monto != monto or monto <= 0:
        raise ReglaNegocio('El monto debe ser un número mayor a 0', 400)
    if monto > MAX_GASTO:
        raise ReglaNegocio(f'El monto no puede pasar de Bs {MAX_GASTO}', 400)
    descripcion = (descripcion or '').strip()
    if not descripcion:
        raise ReglaNegocio('Escribe en qué se gastó', 400)
    if len(descripcion) > 200:
        raise ReglaNegocio('El detalle es demasiado largo (máximo 200 letras)', 400)

    monto = round(float(monto), 2)
    if not es_admin():
        ya = total_gastos(turno)
        if ya + monto > TOPE_CAJERO_POR_TURNO + 0.005:
            restante = max(0.0, TOPE_CAJERO_POR_TURNO - ya)
            raise ReglaNegocio(
                f'Un cajero puede sacar hasta Bs {TOPE_CAJERO_POR_TURNO} por turno '
                f'(te quedan Bs {restante:.2f}). Para más, lo registra el administrador', 403)

    gasto = GastoCaja(turno.id, usuario_actual().id, monto, categoria, descripcion)
    db.session.add(gasto)
    db.session.commit()
    return gasto


def anular_gasto(gasto):
    """El administrador anula cualquiera; el cajero solo los suyos mientras el turno sigue abierto."""
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    if gasto.anulado:
        raise ReglaNegocio('Ese gasto ya está anulado', 409)
    if not es_admin():
        if gasto.usuario_id != usuario_actual().id:
            raise ReglaNegocio('Solo puedes anular tus propios gastos', 403)
        exigir_turno_abierto(gasto.turno)
    gasto.anulado = True
    gasto.anulado_por_id = usuario_actual().id
    gasto.anulado_en = datetime.utcnow()
    db.session.commit()
    return gasto
