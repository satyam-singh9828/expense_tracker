import React, { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL;
const Signup = () => {
  const [errors, setErrors] = useState([])

  const firstname = useRef()
  const lastname = useRef()
  const email = useRef()
  const password = useRef()
  const confirmPassword = useRef()
 

  const navigate = useNavigate() 
   const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors([])

    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstname: firstname.current.value,
        lastname: lastname.current.value,
        email: email.current.value,
        password: password.current.value,
        confirmPassword: confirmPassword.current.value,
       
      }),
    })

    const data = await response.json()

    if (response.ok) {
      navigate("/login")
    } else {
      setErrors(data.errorMessages)
    }

  }
  return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        {/* Header */}
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Create Account
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Join us in less than a minute 🚀
        </p>

        {/* Error Box */}
      
        {errors.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error.msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <input
              ref={firstname}
              type="text"
              placeholder="First name"
              className="width: 100%
              padding: 0.6rem 0.75rem
              border-radius: 0.5rem
              border: 1px solid #d1d5db
              font-size: 0.875rem"
            />
            <input
              ref={lastname}
              type="text"
              placeholder="Last name"
              className="width: 100%
              padding: 0.6rem 0.75rem
              border-radius: 0.5rem
              border: 1px solid #d1d5db
              font-size: 0.875rem"
            />
          </div>

          <input
            ref={email}
            type="email"
            placeholder="Email address"
            className="width: 100%
            padding: 0.6rem 0.75rem
            border-radius: 0.5rem
            border: 1px solid #d1d5db
            font-size: 0.875rem"
          />

          <input
            ref={password}
            type="password"
            placeholder="Password"
            className=" width: 100%
            padding: 0.6rem 0.75rem
            border-radius: 0.5rem
            border: 1px solid #d1d5db
            font-size: 0.875rem"
          />

          <input
            ref={confirmPassword}
            type="password"
            placeholder="Confirm password"
            className="width: 100%
            padding: 0.6rem 0.75rem
            border-radius: 0.5rem
            border: 1px solid #d1d5db
            font-size: 0.875rem"
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 text-white font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <span className="text-blue-600 font-medium cursor-pointer"  onClick={() => navigate("/login")}>
            Log in
          </span>
        </p>
      </div>

    </div>
  )
}
export default Signup 