import '../../../styles/vendor/animate-css/animate.css'

const CreateModule = ({ modalRef, module, setModule }) => {

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(module);
    }

    return <>
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <h4 className="modal-title" id="modalCenterTitle">Agregar Modulo</h4>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div className="modal-body">
                    <p className="text-muted m-0">
                        <a href="https://remixicon.com/" target="_blank" rel="noopener noreferrer">
                            <i className="ri-information-line"></i> Iconos de Remix Icon <small>(Abrir en nueva pestaña)</small>
                        </a>
                    </p>
                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <div className="form-floating form-floating-outline">
                                <input
                                    type="text"
                                    id="name"
                                    className="form-control"
                                    placeholder="Nombre unico del modulo"
                                    value={module.name}
                                    onChange={(e) => setModule({ ...module, name: e.target.value })}
                                />
                                <label htmlFor="name">Nombre del modulo</label>
                            </div>
                        </div>

                        <div className="col mb-6 mt-2">
                            <div className="form-floating form-floating-outline">
                                <input
                                    type="number"
                                    id="position"
                                    className="form-control"
                                    placeholder="Posicion del modulo"
                                    value={module.position}
                                    onChange={(e) => setModule({ ...module, position: e.target.value ? parseInt(e.target.value) : 1 })}
                                />
                                <label htmlFor="position">Posicion del modulo</label>
                            </div>
                        </div>
                    </div>
                    <div className="row g-4">
                        <div className="col mb-6 mt-2">
                            <div className="form-floating form-floating-outline">
                                <input
                                    type="text"
                                    id="url"
                                    className="form-control"
                                    placeholder="Url del modulo"
                                    value={module.url}
                                    onChange={(e) => setModule({ ...module, url: e.target.value })}
                                />
                                <label htmlFor="url">Url del modulo</label>
                            </div>
                        </div>
                        <div className="col mb-6 mt-2">
                            <div className="form-floating form-floating-outline">
                                <input
                                    type="text"
                                    id="icon"
                                    className="form-control"
                                    placeholder="Icono del modulo"
                                    value={module.icon}
                                    onChange={(e) => setModule({ ...module, icon: e.target.value })}
                                />
                                <label htmlFor="icon">Icono del modulo</label>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col mb-6 mt-2">
                            <div className="form-floating form-floating-outline mb-6">
                                <textarea
                                    className="form-control h-px-100"
                                    id="description"
                                    placeholder="Descripcion del modulo"
                                    value={module.description}
                                    onChange={(e) => setModule({ ...module, description: e.target.value })}
                                ></textarea>
                                <label htmlFor="description">Descripcion del modulo</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cerrar
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
                </div>
            </div>
            </div>
        </div>
    </>;
}

export default CreateModule;