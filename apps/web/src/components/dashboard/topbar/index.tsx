import { Search } from './search'

type TopbarProps = {}

const Topbar = (props: TopbarProps) => {
  return (
    <div className="flex items-center justify-between pt-4 px-4">
      <div></div>
      <div className="flex items-center justify-start gap-4">
        <Search />
        <div>UserMenu</div>
      </div>
    </div>
  )
}

export default Topbar
