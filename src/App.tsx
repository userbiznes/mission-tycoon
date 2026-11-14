import { Scene } from './scene/Scene'

export function App() {
  return (
    <div className="stage">
      <div className="phone">
        <div className="world">
          <Scene />
        </div>
        <div className="ui" />
      </div>
    </div>
  )
}
