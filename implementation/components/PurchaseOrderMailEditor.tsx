'use client';

import { useState } from 'react';

export default function PurchaseOrderMailEditor({
  purchaseOrderId,
  defaultTo,
  defaultSubject,
  defaultBody,
}: {
  purchaseOrderId: string;
  defaultTo: string | null;
  defaultSubject: string;
  defaultBody: string;
}) {
  const [to, setTo] = useState(defaultTo ?? '');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isDisabled = !to.trim() || !subject.trim() || !body.trim();

  async function saveDraft() {
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/orders/purchase-orders/${purchaseOrderId}/mail-draft`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          body,
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Mailudkast kunne ikke gemmes');
        setIsSaving(false);
        return;
      }

      setMessage(data.message ?? 'Mailudkast er gemt');
      setIsSaving(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mailudkast kunne ikke gemmes');
      setIsSaving(false);
    }
  }

  async function sendMail() {
    setMessage(null);
    setIsSending(true);

    try {
      const response = await fetch(`/api/orders/purchase-orders/${purchaseOrderId}/send-mail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          body,
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Ordre-mail kunne ikke sendes');
        setIsSending(false);
        return;
      }

      setMessage(data.message ?? 'Ordre-mail sendt');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ordre-mail kunne ikke sendes');
      setIsSending(false);
    }
  }

  return (
    <div className="mail-editor">
      <div className="editor-field editor-field-wide">
        <span>Modtager</span>
        <input
          className="editor-input"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="leverandor@firma.dk"
        />
      </div>

      <div className="editor-field editor-field-wide">
        <span>Emne</span>
        <input
          className="editor-input"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Ordre-emne"
        />
      </div>

      <div className="editor-field editor-field-wide">
        <span>Mailtekst</span>
        <textarea
          className="note-textarea mail-editor-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Skriv ordre-mailen her"
        />
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => void saveDraft()}
          disabled={isSaving || isSending || !subject.trim() || !body.trim()}
        >
          {isSaving ? 'Gemmer...' : 'Gem preview'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => void sendMail()}
          disabled={isDisabled || isSaving || isSending}
        >
          {isSending ? 'Sender ordre-mail...' : 'Send ordre-mail'}
        </button>
      </div>

      <p className="table-meta">
        Modtager kan ændres her uden at ændre leverandørkartotekets standardadresse.
      </p>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
