import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Adaptive Learning Platform</h1>
      <ul className="flex space-x-4">
        <li><Link to="/student" className="text-blue-500 hover:underline">Student Area</Link></li>
        <li><Link to="/parent" className="text-blue-500 hover:underline">Parent Area</Link></li>
        <li><Link to="/teacher" className="text-blue-500 hover:underline">Teacher Area</Link></li>
      </ul>
    </div>
  );
}

function StudentArea() {
  return <div className="p-8"><h2>Student Area</h2></div>;
}

function ParentArea() {
  return <div className="p-8"><h2>Parent Area</h2></div>;
}

function TeacherArea() {
  return <div className="p-8"><h2>Teacher Area</h2></div>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student/*" element={<StudentArea />} />
        <Route path="/parent/*" element={<ParentArea />} />
        <Route path="/teacher/*" element={<TeacherArea />} />
      </Routes>
    </Router>
  );
}

