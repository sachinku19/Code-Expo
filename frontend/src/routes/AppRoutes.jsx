import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";

//protected route
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";

// pages
import AdminDashboard from "../pages/AdminDashboard";
import AIChatbot from "../components/chatbot/AIChatbot";

const AppRoutes=()=>{
    return(
        <BrowserRouter>
           <Routes>
              <Route path="/"  element={<Home/>}/>
              <Route path="/login"  element={<Login/>}/>
              <Route path="/register"  element={<Register/>}/>
              <Route path="/profile" element={<Navigate to="/dashboard?tab=profile" replace />} />
              <Route path="/dashboard"  element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
              <Route path="/editor/:roomId"  element={<ProtectedRoute><Editor/></ProtectedRoute>}/>
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              
           </Routes>
           <AIChatbot />
        </BrowserRouter>
    )
}

export default AppRoutes;