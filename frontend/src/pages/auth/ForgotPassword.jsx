import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingresa tu correo.');
      setMessage('');
      return;
    }
    setError('');
    // TODO: llamada a la API para enviar enlace de recuperación
    console.log({ email });
    setMessage('Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          ¿Olvidaste tu contraseña?
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-600 mb-4">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-envelope" />
              </span>
              <InputText
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" correo@ejemplo.com"
                className="w-full"
              />
            </div>
          </div>

          <Button
            type="submit"
            label="Enviar enlace"
            className="w-full p-button-lg p-button-rounded"
          />
        </form>

        <p className="mt-4 text-sm text-center">
          ¿Recordaste tu contraseña?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Iniciar Sesión
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
