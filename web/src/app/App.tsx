import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'
import { ToastProvider } from '../components/Toast'
import { TrainerProvider } from '../hooks/useTrainer'
import { NotFound } from '../features/NotFound'
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
import { HistoricoPage } from '../features/historico/HistoricoPage'
import { ConfiguracoesPage } from '../features/configuracoes/ConfiguracoesPage'

// Gráficos carregados só quando a tela é aberta.
const EstatisticasPage = lazy(() => import('../features/estatisticas/EstatisticasPage'))
const loading = <p className="p-6 text-center text-stone-500">Carregando…</p>

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
      { path: 'historico', element: <HistoricoPage /> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },
      {
        path: 'estatisticas',
        element: (
          <Suspense fallback={loading}>
            <EstatisticasPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFound /> },
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
