import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'
import { ToastProvider } from '../components/Toast'
import { TrainerProvider } from '../hooks/useTrainer'
import { Placeholder } from '../features/Placeholder'
import { PainelPage } from '../features/painel/PainelPage'
import { XixiPage } from '../features/xixi/XixiPage'
import { TreinoPage } from '../features/sessao/TreinoPage'
import { SessionProvider } from '../features/sessao/SessionContext'
import { ClickerPage } from '../features/clicker/ClickerPage'
import { ProgressoPage } from '../features/progresso/ProgressoPage'
import { SkillDetailPage } from '../features/progresso/SkillDetailPage'
import { MaisPage } from '../features/mais/MaisPage'
import { AtividadePage } from '../features/atividade/AtividadePage'
import { ChecklistPage } from '../features/checklist/ChecklistPage'

// HashRouter (#/rota) funciona no GitHub Pages e offline sem configuração de servidor.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <PainelPage /> },
      { path: 'treino', element: <TreinoPage /> },
      { path: 'clicker', element: <ClickerPage /> },
      { path: 'xixi', element: <XixiPage /> },
      { path: 'progresso', element: <ProgressoPage /> },
      { path: 'progresso/:skillId', element: <SkillDetailPage /> },
      { path: 'mais', element: <MaisPage /> },
      { path: 'atividade', element: <AtividadePage /> },
      { path: 'checklist', element: <ChecklistPage /> },
      { path: '*', element: <Placeholder title="Página não encontrada" /> },
    ],
  },
])

export function App() {
  return (
    <TrainerProvider>
      <ToastProvider>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </ToastProvider>
    </TrainerProvider>
  )
}
