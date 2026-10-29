import { createBrowserRouter } from 'react-router'
import { LoginPage } from '../auth/LoginPage.tsx'
import { ErrorPage } from '../pages/ErrorPage.tsx'
import { NoAutorizadoPage } from '../pages/NoAutorizadoPage.tsx'
import { NoEncontradoPage } from '../pages/NoEncontradoPage.tsx'
import { ACCESOS } from './accesos.tsx'
import { AppLayout } from './AppLayout.tsx'
import { InicioRedirect } from './InicioRedirect.tsx'
import { ProtectedRoute } from './ProtectedRoute.tsx'

export const router = createBrowserRouter([
  {
    // Ruta sin path propio: si cualquier pantalla falla al dibujarse, se muestra <ErrorPage />.
    errorElement: <ErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        // Todo lo de aquí dentro exige sesión.
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <InicioRedirect /> },
              // Una ruta por cada acceso (y sus pantallas internas), protegida con los roles que declara.
              ...ACCESOS.flatMap(({ roles, path, Page, hijas = [] }) =>
                [{ path, Page }, ...hijas].map((ruta) => ({
                  path: ruta.path,
                  element: (
                    <ProtectedRoute roles={roles}>
                      <ruta.Page />
                    </ProtectedRoute>
                  ),
                })),
              ),
              { path: '/no-autorizado', element: <NoAutorizadoPage /> },
              { path: '*', element: <NoEncontradoPage /> },
            ],
          },
        ],
      },
    ],
  },
])