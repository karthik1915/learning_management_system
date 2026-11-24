import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'

function Topbar() {
  const router = useRouter()

  return (
    <div className="px-4 py-2 border-b border-border">
      <Button onClick={() => router.history.back()}>Back</Button>
    </div>
  )
}

export default Topbar
