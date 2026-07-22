"use client";

import React from 'react';
import { Search, Plus } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAddClick?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  responsiveCards?: boolean;
}

export function DataTable<T>({
  title,
  data,
  columns,
  onAddClick,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  responsiveCards = false,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState("");

  const currentSearch = searchValue !== undefined ? searchValue : internalSearch;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const filteredData = React.useMemo(() => {
    if (!currentSearch.trim()) return data;
    const q = currentSearch.toLowerCase().trim();
    return data.filter((item) => {
      return columns.some((col) => {
        const val = item[col.accessorKey];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, columns, currentSearch]);

  return (
    <div className="flex flex-col gap-6 w-full text-[#280003]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{title}</h2>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={currentSearch}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="block w-full pl-10 pr-3 py-2 border border-gray-100 shadow-sm rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#004777] focus:border-[#004777] sm:text-sm transition-colors"
            />
          </div>

          {/* Add Button */}
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#004777] text-white px-4 py-2 rounded-xl hover:bg-[#003355] transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar Novo
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {responsiveCards && (
          <div className="divide-y divide-gray-100 md:hidden">
            {filteredData.map((row, rowIndex) => (
              <article key={rowIndex} className="space-y-3 p-4">
                {columns.map((col, colIndex) => (
                  <div
                    key={colIndex}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-3"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {col.header}
                    </span>
                    <div className="min-w-0 break-words text-right text-sm text-[#280003]">
                      {col.cell ? col.cell(row) : (row[col.accessorKey] as React.ReactNode)}
                    </div>
                  </div>
                ))}
              </article>
            ))}
            {filteredData.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                Nenhum registro encontrado.
              </div>
            )}
          </div>
        )}

        <div className={responsiveCards ? "hidden w-full overflow-hidden md:block" : "overflow-x-auto"}>
          <table className={responsiveCards ? "w-full table-fixed" : "w-full whitespace-nowrap"}>
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={responsiveCards
                      ? "px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider break-words"
                      : "px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    }
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors group">
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={responsiveCards
                        ? "px-3 py-4 align-top text-sm text-[#280003] break-words"
                        : "px-6 py-4 text-sm text-[#280003]"
                      }
                    >
                      {col.cell ? col.cell(row) : (row[col.accessorKey] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
