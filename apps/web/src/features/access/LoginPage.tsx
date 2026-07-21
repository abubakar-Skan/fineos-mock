import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../app/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fx-login">
      <form className="fx-login-card" aria-label="Sign in" onSubmit={(event) => submit(event, navigate, setError)}>
        <div className="fx-login-banner">FINEOS</div>
        <LoginFields error={error} />
      </form>
    </div>
  );
}

function LoginFields({ error }: { readonly error: string | null }) {
  return (
    <div className="fx-login-body">
      <p className="fx-login-title">Sign in with your email and password</p>
      <TextField label="Email" name="email" type="email" defaultValue="jekwueme@unum.com" />
      <TextField label="Password" name="password" type="password" placeholder="Password" />
      {error && <p role="alert" className="fx-error">{error}</p>}
      <button type="submit" className="fx-primary fx-signin">Sign in</button>
    </div>
  );
}

interface TextFieldProps {
  readonly label: string;
  readonly name: string;
  readonly type?: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
}

function TextField(props: TextFieldProps) {
  return (
    <label className="fx-field">
      <span className="fx-field-label">{props.label}</span>
      <input className="fx-input" name={props.name} type={props.type ?? "text"} defaultValue={props.defaultValue} placeholder={props.placeholder} />
    </label>
  );
}

const submit = async (
  event: FormEvent<HTMLFormElement>,
  navigate: (to: string) => void,
  setError: (message: string | null) => void,
): Promise<void> => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const result = await login(field(form, "email"), field(form, "password"));
  if (result.ok) navigate("/dashboard");
  else setError(result.message);
};

const field = (form: FormData, key: string): string => String(form.get(key) ?? "");
