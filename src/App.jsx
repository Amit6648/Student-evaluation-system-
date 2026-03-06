import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClassroomDetail from './pages/ClassroomDetail';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/class/:id" element={<ClassroomDetail />} />
        </Routes>
    );
}

export default App;
