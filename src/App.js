import './App.css';

import {
    BrowserRouter,
    Routes,
    Route
} from 'react-router-dom';

import Home from './pages/Home';

import EditorPage from './pages/EditorPage';

import {
    ToastContainer
} from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

function App() {

    return (

        <>

            <ToastContainer
    position="top-right"
    autoClose={700}
    hideProgressBar={true}
    newestOnTop={true}
    closeOnClick
    pauseOnHover={false}
    draggable={false}
    limit={1}
    theme="colored"
    toastStyle={{
        background:
            'linear-gradient(135deg, #c084fc, #8b5cf6)',

        color: '#fff',

        borderRadius: '12px',

        fontSize: '15px',

        fontWeight: '500',

        boxShadow:
            '0 4px 15px rgba(0,0,0,0.2)',
    }}
/>

            {/* ROUTES */}
            <BrowserRouter>

                <Routes>

                    <Route
                        path="/"
                        element={<Home />}
                    />

                    <Route
                        path="/editor/:roomID"
                        element={<EditorPage />}
                    />

                </Routes>

            </BrowserRouter>

        </>

    );

}

export default App;