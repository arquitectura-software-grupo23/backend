1. Instalar ```transbank-sdk```
2. Crear una funcion que se encargue de crear transacciones
```js
const createTransbankTransaction = async (price) => {
  const transaction = await (new WebpayPlus.Transaction()).create(
    'ID',
    'ID',
    price,
    'RETURN URL',
  );

  return transaction;
};

```
3. Al momento de crear una peticion de compra, llamar a  `createTransbankTransaction(quantity * stock.price);`
4. Al momento recibir las validaciones del mqtt llamar a 
```js
      await new WebpayPlus.Transaction().commit(req.body.token_ws);
      const status = await new WebpayPlus.Transaction().status(req.body.token_ws);
```
para saber el status de la transaccion
5. Utilizar esto para actualizar el estatus de la validacion en el backend
