export type EstadoPedido = 'pendiente' | 'confirmado' | 'en_proceso' | 'enviado' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado';
export interface Categoria {
    id: string;
    nombre: string;
    slug: string;
    descripcion?: string;
    imagen_url?: string;
    orden: number;
    activo: boolean;
    created_at: string;
}
export interface Producto {
    id: string;
    nombre: string;
    slug: string;
    descripcion?: string;
    precio?: number;
    precio_desde: boolean;
    stock: number;
    stock_ilimitado: boolean;
    categoria_id?: string;
    categoria?: Categoria;
    imagen_principal_url?: string;
    imagenes?: ImagenProducto[];
    activo: boolean;
    destaca: boolean;
    requiere_personalizacion: boolean;
    created_at: string;
    updated_at: string;
}
export interface ImagenProducto {
    id: string;
    producto_id: string;
    url: string;
    alt?: string;
    orden: number;
    created_at: string;
}
export interface Cliente {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    user_id?: string;
    created_at: string;
}
export interface Pedido {
    id: string;
    cliente_id?: string;
    cliente?: Cliente;
    estado: EstadoPedido;
    total: number;
    notas?: string;
    items?: PedidoItem[];
    pagos?: Pago[];
    created_at: string;
    updated_at: string;
}
export interface PedidoItem {
    id: string;
    pedido_id: string;
    producto_id?: string;
    producto?: Producto;
    nombre_producto: string;
    precio_unitario: number;
    cantidad: number;
    notas_personalizacion?: string;
    archivos?: ArchivoCliente[];
    created_at: string;
}
export interface ArchivoCliente {
    id: string;
    pedido_item_id?: string;
    cliente_id?: string;
    nombre_archivo: string;
    url: string;
    tipo?: string;
    tamano_bytes?: number;
    created_at: string;
}
export interface Pago {
    id: string;
    pedido_id: string;
    proveedor: string;
    monto: number;
    moneda: string;
    estado: EstadoPago;
    external_id?: string;
    datos_pago?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface CreateOrderDTO {
    cliente: {
        nombre: string;
        email?: string;
        telefono?: string;
    };
    items: {
        producto_id: string;
        nombre_producto: string;
        precio_unitario: number;
        cantidad: number;
        notas_personalizacion?: string;
        archivos_ids?: string[];
    }[];
    notas?: string;
}
export interface SignedUrlRequest {
    filename: string;
    contentType: string;
    pedido_item_id?: string;
    cliente_id?: string;
}
export interface SignedUrlResponse {
    signedUrl: string;
    path: string;
    publicUrl: string;
    token: string;
}
export interface CreatePreferenceRequest {
    pedido_id: string;
}
export interface CreatePreferenceResponse {
    preference_id: string;
    init_point: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface CartItemData {
    producto: Producto;
    cantidad: number;
    notas_personalizacion?: string;
    archivos_nombres?: string[];
}
export interface ProductFilters {
    categoria?: string;
    destacado?: boolean;
    q?: string;
}
