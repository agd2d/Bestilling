'use client';

export default function SupplierMailButton({
  to,
  subject,
  body,
  label = 'Send ordre-mail',
}: {
  to: string | null;
  subject: string;
  body: string;
  label?: string;
}) {
  const disabled = !to;

  function openMail() {
    if (!to) return;

    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  return (
    <button
      type="button"
      className={`button ${disabled ? 'secondary' : ''}`}
      onClick={openMail}
      disabled={disabled}
    >
      {disabled ? 'Mangler ordre-e-mail' : label}
    </button>
  );
}
