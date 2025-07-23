import React, { useState, useMemo, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';

/* ---------- utilidades ---------- */
const capitalizeWords = (str = '') =>
  str
    .toLocaleLowerCase('es')
    .split(/(\s|-)/)
    .map(w =>
      w.match(/\s|-/) ? w : w.charAt(0).toLocaleUpperCase('es') + w.slice(1)
    )
    .join('');

const toEmailLower = (str = '') => str.toLocaleLowerCase('en');

const getPasswordStrength = pw => {
  if (pw.length < 8) return 'weak';
  const hasLetters = /[a-zA-Z]/.test(pw);
  const hasNumbers = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (hasLetters && hasNumbers && hasSpecial && pw.length >= 12) return 'strong';
  if (hasLetters && hasNumbers) return 'medium';
  return 'weak';
};

export default function Register() {
  const [usuario, setUsuario] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmContrasena, setConfirmContrasena] = useState('');
  const [showContrasena, setShowContrasena] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(contrasena), [contrasena]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .calypso-focus:focus {
        outline: none !important;
        box-shadow: none !important;
        border: 2px solid #00BCD4 !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!usuario || !apellido || !email || !contrasena || !confirmContrasena) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (contrasena !== confirmContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (strength === 'weak') {
      setError(
        'La contraseña debe tener al menos 8 caracteres e incluir letras y números'
      );
      return;
    }

    setError('');
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:3300';
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: usuario,
          apellido,
          email,
          password: contrasena,
        }),
      });
      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`Respuesta inesperada (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');

      setSuccess('Cuenta creada correctamente, redirigiendo…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Crear Cuenta
        </h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombres */}
          <div>
            <label htmlFor="nombres" className="block text-gray-700 mb-2">
              Nombres
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-user-plus" />
              </span>
              <InputText
                id="nombres"
                name="given-name"
                autoComplete="given-name"
                value={usuario}
                onChange={e => setUsuario(capitalizeWords(e.target.value))}
                placeholder="Carlos Felipe"
                className="w-full calypso-focus"
              />
            </div>
          </div>

          {/* Apellidos */}
          <div>
            <label htmlFor="apellidos" className="block text-gray-700 mb-2">
              Apellidos
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-id-card" />
              </span>
              <InputText
                id="apellidos"
                name="family-name"
                autoComplete="family-name"
                value={apellido}
                onChange={e => setApellido(capitalizeWords(e.target.value))}
                placeholder="Gómez Pérez"
                className="w-full calypso-focus"
              />
            </div>
          </div>

          {/* Correo */}
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Correo
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-envelope" />
              </span>
              <InputText
                id="email"
                name="email"
                type="email"
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"
                value={email}
                onChange={e => setEmail(toEmailLower(e.target.value))}
                placeholder="correo@ejemplo.com"
                className="w-full calypso-focus"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="contrasena" className="block text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="p-inputgroup relative">
              <span className="p-inputgroup-addon">
                <i className="pi pi-lock" />
              </span>
              <InputText
                id="contrasena"
                name="new-password"
                autoComplete="new-password"
                type={showContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                placeholder="Contraseña"
                className="w-full pr-10 calypso-focus"
              />
              <button
                type="button"
                onClick={() => setShowContrasena(!showContrasena)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
              >
                <i className={`pi ${showContrasena ? 'pi-eye-slash' : 'pi-eye'}`} />
              </button>
            </div>

            {/* Barra de fuerza */}
            <div className="mt-2 flex space-x-1">
              <span
                className={`flex-1 h-1 rounded ${
                  strength !== 'weak' ? 'bg-red-500' : 'bg-gray-200'
                }`}
              />
              <span
                className={`flex-1 h-1 rounded ${
                  strength === 'medium' || strength === 'strong'
                    ? 'bg-yellow-500'
                    : 'bg-gray-200'
                }`}
              />
              <span
                className={`flex-1 h-1 rounded ${
                  strength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            </div>
            <p
              className={`mt-1 text-sm ${
                strength === 'weak'
                  ? 'text-red-500'
                  : strength === 'medium'
                  ? 'text-yellow-500'
                  : 'text-green-500'
              }`}
            >
              {strength === 'weak'
                ? 'Débil'
                : strength === 'medium'
                ? 'Mediana'
                : 'Fuerte'}
            </p>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label htmlFor="confirmContrasena" className="block text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <div className="p-inputgroup relative">
              <span className="p-inputgroup-addon">
                <i className="pi pi-lock" />
              </span>
              <InputText
                id="confirmContrasena"
                name="new-password"
                autoComplete="new-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmContrasena}
                onChange={e => setConfirmContrasena(e.target.value)}
                placeholder="Confirmar Contraseña"
                className="w-full pr-10 calypso-focus"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
              >
                <i className={`pi ${showConfirm ? 'pi-eye-slash' : 'pi-eye'}`} />
              </button>
            </div>
          </div>

          <Button
            type="submit"
            label="Registrarse"
            className="w-full p-button-lg p-button-rounded"
          />
        </form>

        <p className="mt-4 text-sm text-center">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Iniciar Sesión
          </a>
        </p>
      </div>
    </div>
  );
}
