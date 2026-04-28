export function Button({ children, onClick, disabled, className = '', variant = 'primary', fullWidth = false, ...props }) {
  const baseStyles = `inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5 ${fullWidth ? 'w-full' : ''}`;
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
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
    <div className="mb-5 w-full">
      {label && <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full min-h-[44px] rounded-md border px-3 py-3 text-base transition focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2 sm:text-sm ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
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
    <div className={`mb-4 rounded-lg border px-4 py-3 ${colors[type]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm sm:text-base">{message}</p>
        {onClose && (
          <button onClick={onClose} type="button" className="touch-target rounded-md font-bold">
            x
          </button>
        )}
      </div>
    </div>
  );
}
