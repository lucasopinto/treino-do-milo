import { Empty, PageHeader } from '../components/ui'

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Empty>Em construção.</Empty>
    </>
  )
}
