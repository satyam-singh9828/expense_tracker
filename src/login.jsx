import React, { useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useState} from "react"
import { useDispatch } from "react-redux"
import { login } from "../store/slices/authslices" 
const API_URL = import.meta.env.VITE_API_URL;
const Login = () => {
    const [error , seterror] = useState([]) ;
    const password = useRef() ;
    const email = useRef() ;
    const navigate = useNavigate() ;
    const dispatch = useDispatch() ;

    const handleSubmit = async (event) => { 

        event.preventDefault() ;
        seterror([]) ;
        const response = await fetch(`${API_URL}/login` , {
            method : "POST" ,
            headers : {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({
                email : email.current.value,
                password : password.current.value
            })
        })
        const data = await response.json() ;
        if(response.ok){
            localStorage.clear() ;
            localStorage.setItem("token", data.token) ;
            dispatch(login(data))
            console.log(data);
            navigate("/home") ;
             
        }
        else if(response.status === 401 || response.status === 403){
            navigate("/signup") ; 
             seterror(data.errors) ;

        }
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            ref={email}
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            ref={password}
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300">
            
            Log In
          </button>
        </form>
        <p className="text-center text-gray-500 mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">  Sign Up</a>
        </p>
      </div>
    </div>
    ) 
}
export default Login ;

