import { Component, type ReactNode } from 'react'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { Empty } from './kit'

/**
 * If a menu ever fails to draw, the player gets a friendly card and a way back
 * to the base instead of a blank screen. The game state itself is untouched.
 */
export class UiBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('A menu failed to draw', error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="modal-wrap">
        <section className="win win-mid" role="alertdialog" aria-label="Something went wrong" data-ui="error">
          <header className="win-head">
            <div className="plaque">
              <h2>Oops</h2>
            </div>
          </header>
          <div className="win-body">
            <Empty icon="alert" error>
              That menu tripped over a cable. Your agency is safe.
            </Empty>
          </div>
          <footer className="win-foot">
            <button
              type="button"
              className="btn"
              data-ui="error.home"
              onClick={() => {
                useUi.setState({ sheet: null, screen: null, regionCard: null, tip: null, levelUp: null })
                useGame.setState({ draft: null })
                this.setState({ failed: false })
              }}
            >
              Back to base
            </button>
          </footer>
        </section>
      </div>
    )
  }
}
