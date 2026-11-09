import { Link } from 'react-router'
import { Empty, PageHeader } from '../components/ui'

export function NotFound() {
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <Empty>
        Esta página não existe.{' '}
        <Link to="/" className="font-semibold underline">
          Voltar ao painel
        </Link>
      </Empty>
    </>
  )
}
