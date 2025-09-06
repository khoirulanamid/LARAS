import SmartLarasCinematicPro from './components/SmartLarasCinematicPro'

export default function App() {
  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">L</div>
          <div>
            <div style={{fontWeight:900, letterSpacing:.3}}>LARAS Cinematic Pro</div>
            <a href="https://khoirulanamid.github.io/LARAS" target="_blank" rel="noreferrer">
              khoirulanamid.github.io/LARAS
            </a>
          </div>
        </div>
        <span className="badge">Simple • Consistent • Pro</span>
      </div>
      <SmartLarasCinematicPro />
    </div>
  )
}
