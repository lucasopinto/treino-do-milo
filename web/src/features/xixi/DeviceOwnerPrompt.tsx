import { useEffect, useState } from 'react'
import { Button, Sheet } from '../../components/ui'
import { useTrainer } from '../../hooks/useTrainer'
import { localTimeZone } from '../../domain/schedule'
import { setDeviceOwner, timeZoneName, useDeviceOwner } from '../../sync/schedule'

/**
 * Pergunta uma vez de quem é este celular. Os lembretes de saída do celular seguem a agenda
 * dessa pessoa, no fuso dela (ex.: o celular do pai, em Portugal, avisa no horário de Lisboa).
 */
export function DeviceOwnerPrompt() {
  const owner = useDeviceOwner()
  const { trainers, setTrainerId } = useTrainer()
  const [later, setLater] = useState(false)

  // Só uma pessoa: não precisa perguntar.
  useEffect(() => {
    if (!owner && trainers.length === 1) void setDeviceOwner(trainers[0]!.id)
  }, [owner, trainers])

  const open = !owner && trainers.length > 1 && !later
  return (
    <Sheet open={open} onClose={() => setLater(true)} title="De quem é este celular?">
      {open && (
        <div className="flex flex-col gap-4">
          <p className="text-stone-700 dark:text-stone-300">
            Cada pessoa tem a sua agenda de saídas, no horário de onde mora. Os lembretes deste celular vão seguir a agenda de quem
            você escolher. O horário daqui é o de <strong>{timeZoneName(localTimeZone())}</strong>.
          </p>
          <div className="grid gap-3">
            {trainers.map((t) => (
              <Button
                key={t.id}
                size="lg"
                onClick={() => {
                  setTrainerId(t.id)
                  void setDeviceOwner(t.id)
                }}
              >
                {t.name}
              </Button>
            ))}
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400">Dá para mudar depois em Mais → Configurações.</p>
        </div>
      )}
    </Sheet>
  )
}
