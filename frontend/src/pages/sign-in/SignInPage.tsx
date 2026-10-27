import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const inputClass = "py-2.5 px-3 border border-border rounded-md text-base"

function SignInPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [password, setPassword] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // 1. 【接收回调逻辑】当后端 42 OAuth 授权成功重定向回前端并带上 ?token=xxx 时触发
    useEffect(() => {
        const token = searchParams.get('token')
        if (token) {
            localStorage.setItem('token', token) // 存储 token
            navigate('/', { replace: true }) // 登录成功，跳转到主页
        }
    }, [searchParams, navigate])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        try {
            await login(email, password)
            navigate('/')
        } catch {
            setError('Login failed')
        }
    }

    // 2. 【发起跳转逻辑】点击按钮时跳转到后端的 42 认证接口
    const handle42Login = () => {
        window.location.href = 'http://localhost:3000/api/auth/oauth/42'
    }

    return (
        <main>
            <form className="flex flex-col gap-2 max-w-[320px] mx-auto my-[320px]" onSubmit={handleSubmit}>
                <h1 className="text-center text-5xl font-serif font-bold">Welcome Back !</h1>
                <div className="relative p-5 bg-surface border border-border rounded-md shadow-card">
                    <div className="flex flex-col gap-2">
                        <input
                            id="identifier"
                            type="text"
                            value={email}
                            placeholder="email or username"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            minLength={2}
                            className={inputClass}
                        />

                        <input
                            id="password"
                            type="password"
                            value={password}
                            placeholder="password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className={inputClass}
                        />
                        {error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-base font-bold text-center">{error}</p>}

                        <button type="submit" className="py-2.5 px-3 rounded-md bg-brand hover:bg-brand-hover text-white text-base cursor-pointer">Sign In</button>

                        <button
                            type="button"
                            onClick={handle42Login}
                            className="py-2.5 px-3 rounded-md border border-border text-center text-base hover:bg-surface cursor-pointer">
                            Sign in with 42
                        </button>
                    </div>
                    <p className="text-text-light mt-2">New ? <Link to="/signup" className="text-brand hover:text-brand-hover">Create an account</Link> </p>
                </div>
            </form>
        </main>
    )
}

export default SignInPage