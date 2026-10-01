import { createBrowserRouter } from 'react-router'
import { LoginPage } from '../auth/LoginPage.tsx'
import { NoAutorizadoPage } from '../pages/NoAutorizadoPage.tsx'
import { NoEncontradoPage } from '../pages/NoEncontradoPage.tsx'
import { ACCESOS } from './accesos.tsx'
import { AppLayout } from './AppLayout.tsx'
import { InicioRedirect } from './InicioRedirect.tsx'
import { ProtectedRoute } from './ProtectedRoute.tsx'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Todo lo de aquí dentro exige sesión.
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <InicioRedirect /> },
          // Una ruta por cada acceso, protegida con los roles que declara.
          ...ACCESOS.map(({ path, roles, Page }) => ({
            path,
            element: (
              <ProtectedRoute roles={roles}>
                <Page />
              </ProtectedRoute>
            ),
          })),
          { path: '/no-autorizado', element: <NoAutorizadoPage /> },
          { path: '*', element: <NoEncontradoPage /> },
        ],
      },
    ],
  },
])