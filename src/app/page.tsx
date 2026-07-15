import GameContainer from '../components/GameContainer';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <GameContainer />
    </div>
  );
}
