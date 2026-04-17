import Razorpay from 'razorpay';
console.log('Razorpay:', Razorpay);
console.log('Type:', typeof Razorpay);
const r = new Razorpay({ key_id: 'test', key_secret: 'test' });
console.log('Instance:', r);
console.log('Orders:', r.orders);
