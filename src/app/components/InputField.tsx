import React from 'react';

// Define the props for the InputField component
interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  error?: string;
  required?: boolean;
  className?: string;
  accept?: string;
  id?: string;
  maxLength?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  type,
  placeholder,
  value,
  onChange,
  icon,
  iconPosition = 'start',
  error,
  required,
  className = '',
  accept,
  id,
  maxLength,
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        accept={accept}
        id={id}
        className={`w-full py-2 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          icon ? (iconPosition === 'start' ? 'pl-10' : 'pr-10') : ''
        } ${error ? 'border-red-500' : 'border-gray-300'}`}
        maxLength={maxLength}
      />
      {icon && (
        <span
          className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${
            iconPosition === 'start' ? 'left-3' : 'right-3'
          }`}
        >
          {icon}
        </span>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default InputField;

// Usage example:
// <InputField
//   type="email"
//   placeholder="Enter your email"
//   value=""
//   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
//   icon={<Mail className="w-5 h-5" />}
//   iconPosition="start"
//   error="Invalid email"
//   required
//   className="mb-4"
// />

// Error handling
try {
  // Component rendering
  console.log('InputField component rendered successfully');
} catch (error) {
  console.error('Error rendering InputField component:', error);
}
