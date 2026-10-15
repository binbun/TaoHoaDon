import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="bg-surface">
      <ol className="container-site flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-xs text-ink-muted">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <li aria-hidden>/</li>}
            <li className={i === items.length - 1 ? 'font-medium text-ink' : ''}>
              {item.to ? (
                <Link to={item.to} className="hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
