/**
 * @fileoverview Footer compartido de la aplicación.
 * Aparece en el panel admin (AdminLayout) y en el catálogo público (CatalogView).
 * Incluye créditos de desarrollo y la franja de colores FIFA 2026 como separador visual.
 */

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * @description Footer con créditos de desarrollo.
 * Usa la misma paleta visual que el header (franja 7 colores + fondo oscuro).
 *
 * @returns Elemento <footer> con créditos de AmalfiDev
 */
export function Footer() {
  return (
    <footer className="mt-auto bg-[#0a0a14]">

      {/* Franja multicolor superior — espejo del header */}
      <div className="h-0.5 w-full flex">
        <div className="flex-1 bg-[#E8192C]" />
        <div className="flex-1 bg-[#F7941D]" />
        <div className="flex-1 bg-[#FFC72C]" />
        <div className="flex-1 bg-[#00A651]" />
        <div className="flex-1 bg-[#009EA6]" />
        <div className="flex-1 bg-[#003DA5]" />
        <div className="flex-1 bg-[#8B5CF6]" />
      </div>

      {/* Texto de créditos */}
      <div className="max-w-7xl mx-auto px-4 py-3 text-center">
        <p className="text-xs" style={{ color: '#6b7280' }}>
          Desarrollado para{" "}
          <span className="font-semibold" style={{ color: '#FFC72C' }}>@n_baez1</span>{" "}
          por{" "}
          <span className="font-black" style={{ color: '#ffffff' }}>AmalfiDev</span>
          {" "}· 2026
        </p>
      </div>
    </footer>
  );
}
