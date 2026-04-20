
import { ref } from 'vue'

export const REGEX = {
  nombre:       /^[a-zA-ZÀ-ÿ\s.]{3,40}$/,
  nombre_combo: /^[a-zA-ZÀ-ÿ0-9\s.,'"\-]{3,30}$/,
  correo:       /^[^\s@]+@[^\s@]+\.[a-zA-ZÀ-ÿ]{2,10}$/,
  cedula:       /^\d{6,12}$/,
  telefono:     /^\d{7,8}$/,
  nit:          /^\d{5,12}$/,
  direccion:    /^.{5,}$/,
  precio_extra: /^\d+(\.\d{1,2})?$/,
  precio:       /^\d+(\.\d{1,2})?$/,
  categoria:    /^[a-zA-ZÀ-ÿ0-9_\-]{2,}$/,
  contra:       /^.{6,}$/,
  codigo:       /^[a-zA-Z0-9\-]{2,20}$/,
} as const

export type CampoValidable = keyof typeof REGEX

const MENSAJES: Record<CampoValidable, { obligatorio: string; invalido: string }> = {
  nombre: {
    obligatorio: 'El nombre es obligatorio.',
    invalido:    'Mín. 3 letras. Sin números ni caracteres especiales. Max. 40 letras',
  },
  nombre_combo: {
    obligatorio: 'El nombre del combo es obligatorio.',
    invalido:    'Mín. 3 caracteres. Letras, números y puntuación básica. Max. 30 letras',
  },
  correo: {
    obligatorio: 'El correo es obligatorio.',
    invalido:    'Ingresa un correo válido. Ej: adalid@pizzeria.com',
  },
  cedula: {
    obligatorio: 'La cédula es obligatoria.',
    invalido:    'Solo números. Entre 6 y 12 dígitos.',
  },
  telefono: {
    obligatorio: 'El teléfono es obligatorio.',
    invalido:    'Debe tener 7 u 8 dígitos numéricos.',
  },
  nit: {
    obligatorio: 'El NIT es obligatorio.',
    invalido:    'Debe tener entre 5 y 12 dígitos numéricos.',
  },
  direccion: {
    obligatorio: 'La dirección es obligatoria.',
    invalido:    'La dirección debe tener al menos 5 caracteres.',
  },
  precio_extra: {
    obligatorio: 'El precio extra es obligatorio.',
    invalido:    'Solo números positivos. Máx. 2 decimales. Ej: 5.50',
  },
  precio: {
    obligatorio: 'El precio es obligatorio.',
    invalido:    'Solo números positivos. Máx. 2 decimales. Ej: 25.00',
  },
  categoria: {
    obligatorio: 'Selecciona una categoría.',
    invalido:    'Categoría no válida.',
  },
  contra: {
    obligatorio: 'La contraseña es obligatoria.',
    invalido:    'La contraseña debe tener al menos 6 caracteres.',
  },
  codigo: {
    obligatorio: 'El código es obligatorio.',
    invalido:    'Entre 2 y 20 caracteres. Solo letras, números y guiones.',
  },
}

const OPCIONALES: CampoValidable[] = ['codigo']

export function useValidacion() {
  const errors  = ref<Record<string, string>>({})
  const touched = ref<Record<string, boolean>>({})

  /**
   * Valida un campo individual y actualiza `errors`.
   * @param campo   - clave del campo (debe existir en REGEX)
   * @param valor   - valor actual como string
   * @returns       - true si el campo es válido
   */
  function validarCampo(campo: CampoValidable, valor: string, required = true): boolean {
    touched.value[campo] = true
    const trimmed = valor.trim()

    if (!trimmed) {
      if (!required || OPCIONALES.includes(campo)) {
        errors.value[campo] = ''
        return true
      }
      errors.value[campo] = MENSAJES[campo].obligatorio
      return false
    }

    const ok = REGEX[campo].test(trimmed)

    if (campo === 'precio_extra' && ok && Number(trimmed) < 0) {
      errors.value[campo] = 'El precio no puede ser negativo.'
      return false
    }

    errors.value[campo] = ok ? '' : MENSAJES[campo].invalido
    return ok
  }

  /**
   * Valida un campo de confirmación de contraseña.
   * @param contra        - contraseña original
   * @param contraConfirm - contraseña repetida
   * @returns             - true si coinciden
   */
  function validarContraConfirm(contra: string, contraConfirm: string): boolean {
    touched.value['contra_confirm'] = true
    if (!contraConfirm) {
      errors.value['contra_confirm'] = 'Confirma tu contraseña.'
      return false
    }
    const ok = contra === contraConfirm
    errors.value['contra_confirm'] = ok ? '' : 'Las contraseñas no coinciden.'
    return ok
  }

  /**
   * Valida un campo de rol (número > 0).
   * @param rolId - id del rol seleccionado
   * @returns     - true si se seleccionó un rol válido
   */
  function validarRol(rolId: number): boolean {
    touched.value['rol_id'] = true
    const ok = rolId > 0
    errors.value['rol_id'] = ok ? '' : 'Selecciona un rol.'
    return ok
  }

  /**
   * Indica si un campo tiene error y ya fue tocado (para mostrar ícono).
   */
  function campoConError(campo: string): boolean {
    return !!touched.value[campo] && !!errors.value[campo]
  }

  /**
   * Indica si un campo es válido y ya fue tocado (para mostrar ícono verde).
   */
  function campoValido(campo: string, valor: string | number): boolean {
    if (typeof valor === 'string') {
      return !!touched.value[campo] && !!valor.trim() && !errors.value[campo]
    }
    // Para campos numéricos (ej. price) consideramos válido cuando fue tocado,
    // es un número y no tiene error registrado.
    const n = Number(valor)
    return !!touched.value[campo] && !isNaN(n) && !errors.value[campo] && n > 0
  }

  /**
   * Valida un campo numérico de precio (mayor a 0).
   * Usado para precio de producto/combo donde el input es type="number".
   * @param campo  - clave del error (ej: 'precio', 'price')
   * @param valor  - valor numérico
   * @returns      - true si es válido
   */
  function validarPrecio(
    campo: string,
    valor: number | string,
    max = 1000,
    required = true,
  ): boolean {
    touched.value[campo] = true
    const n = Number(valor)

    if (!valor && valor !== 0) {
      if (required) {
        errors.value[campo] = 'El precio es obligatorio.'
        return false
      }
      errors.value[campo] = ''
      return true
    }

    if (isNaN(n)) {
      errors.value[campo] = 'El precio no es válido.'
      return false
    }

    if (n < 0) {
      errors.value[campo] = 'El precio no puede ser negativo.'
      return false
    }

    if (required && n === 0) {
      errors.value[campo] = 'El precio debe ser mayor a 0.'
      return false
    }

    if (n >= max) {
      errors.value[campo] = `El precio debe ser menor a ${max}.`
      return false
    }

    errors.value[campo] = ''
    return true
  }

  /**
   * Valida que una lista tenga al menos un elemento.
   * Usado para ingredientes, productos de combo, etc.
   * @param campo   - clave del error
   * @param lista   - array a validar
   * @param mensaje - mensaje de error personalizado
   * @returns       - true si la lista no está vacía
   */
  function validarLista(campo: string, lista: unknown[], mensaje: string): boolean {
    touched.value[campo] = true
    const ok = lista.length > 0
    errors.value[campo] = ok ? '' : mensaje
    return ok
  }

  /**
   * Resetea todos los errores y el estado touched.
   */
  function resetValidacion() {
    errors.value  = {}
    touched.value = {}
  }

  return {
    errors,
    touched,
    validarCampo,
    validarContraConfirm,
    validarRol,
    validarPrecio,
    validarLista,
    campoConError,
    campoValido,
    resetValidacion,
  }
}