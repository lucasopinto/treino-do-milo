import { lazy, Suspense, type ReactNode } from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'
import { ToastProvider } from '../components/Toast'
import { TrainerProvider } from '../hooks/useTrainer'
import { Placeholder } from '../features/Placeholder'

// HashRouter (#/rota) funciona no GitHub Pages e offline sem configuração de servidor.

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="p-6 text-center text-stone-500">Carregando…</p>}>{children}</Suspense>
}

void lazy

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Placeholder title="Painel" /> },
      { path: 'treino', element: <Placeholder title="Treino" /> },
      { path: 'xixi', element: <Placeholder title="Xixi e cocô" /> },
      { path: 'progresso', element: <Placeholder title="Progresso" /> },
      { path: 'mais', element: <Placeholder title="Mais" /> },
      { path: '*', element: <Lazy><Placeholder title="Página não encontrada" /></Lazy> },
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
