import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'
import { ToastProvider } from '../components/Toast'
import { TrainerProvider } from '../hooks/useTrainer'
import { Placeholder } from '../features/Placeholder'
import { PainelPage } from '../features/painel/PainelPage'
import { XixiPage } from '../features/xixi/XixiPage'

// HashRouter (#/rota) funciona no GitHub Pages e offline sem configuração de servidor.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <PainelPage /> },
      { path: 'treino', element: <Placeholder title="Treino" /> },
      { path: 'xixi', element: <XixiPage /> },
      { path: 'progresso', element: <Placeholder title="Progresso" /> },
      { path: 'mais', element: <Placeholder title="Mais" /> },
      { path: '*', element: <Placeholder title="Página não encontrada" /> },
    ],
  },
])

export function App() {
  return (
    <TrainerProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </TrainerProvider>
  )
}
