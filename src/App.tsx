import type { ReactElement } from 'react';
import { TaskProvider } from './context/TaskContext';
import Board from './components/Board';

export default function App(): ReactElement {
  return (
    <TaskProvider>
      <Board />
    </TaskProvider>
  );
}
