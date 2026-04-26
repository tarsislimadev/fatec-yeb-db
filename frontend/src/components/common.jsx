export function Button({ children, onClick, disabled, className = '', variant = 'primary', ...props }) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, type = 'text', value, onChange, placeholder, error, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export function Alert({ type = 'error', message, onClose }) {
  const colors = {
    error: 'bg-red-100 text-red-800 border-red-400',
    success: 'bg-green-100 text-green-800 border-green-400',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  };

  return (
    <div className={`border px-4 py-3 rounded mb-4 ${colors[type]}`}>
      <div className="flex justify-between items-start">
        <p>{message}</p>
        {onClose && (
          <button onClick={onClose} className="font-bold">
            x
          </button>
        )}
      </div>
    </div>
  );
}
