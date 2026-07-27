import { useState } from 'react'

import {Routes , Route , BrowserRouter} from 'react-router-dom'
import './index.css'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import Signup from './signup'
import Login from './login'
import Home from './home'
function App() {
   const {userType } = useSelector(state => state.auth) ;

  return (
    <BrowserRouter>
    
      <Routes>
         <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
