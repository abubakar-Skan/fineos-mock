import type { ReactNode } from "react";

export interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly emptyLabel?: string;
}

export function DataTable<T>(props: DataTableProps<T>) {
  if (props.rows.length === 0) return <EmptyState label={props.emptyLabel ?? "No Data Available"} />;
  return (
    <table className="fx-table">
      <TableHead columns={props.columns} />
      <TableBody columns={props.columns} rows={props.rows} rowKey={props.rowKey} />
    </table>
  );
}

export function EmptyState({ label }: { readonly label: string }) {
  return <div className="fx-empty">{label}</div>;
}

function TableHead<T>({ columns }: { readonly columns: readonly Column<T>[] }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th key={column.key}>{column.header}</th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody<T>(props: Omit<DataTableProps<T>, "emptyLabel">) {
  return (
    <tbody>
      {props.rows.map((row) => (
        <TableRow key={props.rowKey(row)} columns={props.columns} row={row} />
      ))}
    </tbody>
  );
}

function TableRow<T>({ columns, row }: { readonly columns: readonly Column<T>[]; readonly row: T }) {
  return (
    <tr>
      {columns.map((column) => (
        <td key={column.key}>{column.render(row)}</td>
      ))}
    </tr>
  );
}
