import React, { useState } from 'react';
import { formatPhone as formatPhoneUtil } from '../../utils/constants';
import './PhoneInput.css';

export default function PhoneInput({ value, onChange, placeholder }) {
  const [display, setDisplay] = useState(value || '');

  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = formatPhoneUtil(raw);
    setDisplay(formatted);
    if (onChange) {
      const digits = formatted.replace(/\D/g, '');
      onChange(digits);
    }
  };

  return (
    <input
      type="tel"
      className="phone-input"
      value={display}
      onChange={handleChange}
      placeholder={placeholder || '+7 ___ ___ __ __'}
    />
  );
}
