import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DataTableReference from '../../components/organism/DataTable';
import { useSelector } from 'react-redux';

const IndexInvoices = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => { return p.code.includes('INVOICE') }) || []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const navigate = useNavigate();

    const { type } = useParams();
    const INVOICE_TYPES = {
        purchase: { name: 'Compras', code: 'fc' }
    };
    const [typeName, setTypeName] = useState(INVOICE_TYPES[type].name);
    const [url, setUrl] = useState(['api/v1/invoices/search']);

    const [data, setData] = useState([]);

    // Info DataTable
    const dataTable = useRef(null);
    const table = useRef(null);

    const [columns, setColumns] = useState([
        { data: 'resolution', title: 'Resolución' },
        { data: 'date', title: 'Fecha' },
        { data: 'client', title: 'Tercero' },
        { data: 'amount', title: 'Monto' },
        { data: 'balance', title: 'Saldo' },
        { data: 'status', title: 'Estado' },
        { data: 'action', title: 'Acción' },
    ]);

    const [buttons, setButtons] = useState([
        ...(userPermissions.some(p => p.code === 'CREATE_INVOICE_FC' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Registrar Factura</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: () => {
                navigate('create');
            }
        }] : []),
    ]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Facturas de {typeName.toLowerCase()}</h5>
                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={table}
                        dataTableRef={dataTable}
                        method="POST"
                        buttons={buttons}
                        title={`Facturas de ${typeName.toLowerCase()}`}
                        setData={setData}
                        
                    />
                </div>
            </div>
        </>
    )
}

export default IndexInvoices;