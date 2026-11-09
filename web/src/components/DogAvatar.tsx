import { PawPrint } from 'lucide-react'
import { useSettings } from '../hooks/useData'

export function DogAvatar({ size = 48 }: { size?: number }) {
  const { dogPhoto, dogName } = useSettings()
  return dogPhoto ? (
    <img src={dogPhoto} alt={`Foto do ${dogName}`} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-brand-600" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200" style={{ width: size, height: size }} aria-hidden>
      <PawPrint size={size * 0.55} />
    </span>
  )
}
