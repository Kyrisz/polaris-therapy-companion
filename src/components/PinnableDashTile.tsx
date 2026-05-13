import { Link } from "react-router-dom";
import { PinToggle } from "./PinToggle";

type Props = {
  to: string;
  title: string;
  desc: string;
  /** If set, pin uses this key (e.g. `__today__`) while link goes to `to`. */
  pinPath?: string;
};

export function PinnableDashTile({ to, title, desc, pinPath }: Props) {
  const key = pinPath ?? to;
  return (
    <div className="pinnable-dash-tile-wrap">
      <Link className="dash-tile" to={to}>
        <span className="dash-tile-title">{title}</span>
        <span className="dash-tile-desc">{desc}</span>
      </Link>
      <PinToggle path={key} variant="corner" />
    </div>
  );
}

type PrimaryProps = {
  to: string;
  title: string;
  desc: string;
  pinPath?: string;
};

export function PinnablePrimaryAction({ to, title, desc, pinPath }: PrimaryProps) {
  const key = pinPath ?? to;
  return (
    <div className="dashboard-primary-btn-wrap">
      <Link className="dashboard-primary-btn" to={to}>
        <span className="dashboard-primary-title">{title}</span>
        <span className="dashboard-primary-desc">{desc}</span>
      </Link>
      <PinToggle path={key} variant="corner" />
    </div>
  );
}
