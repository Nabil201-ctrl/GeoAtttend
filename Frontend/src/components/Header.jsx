import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary">GeoAttend</h1>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
          }}
          className="p-2 bg-error text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}