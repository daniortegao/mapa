function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Error de validación de JSON
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'JSON inválido en el cuerpo de la solicitud'
        });
    }

    // Error de archivo no encontrado
    if (err.code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            error: 'Archivo no encontrado'
        });
    }

    // Error genérico
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}

module.exports = errorHandler;