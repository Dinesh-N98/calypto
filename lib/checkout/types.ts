export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CheckoutAddress = {
  streetAddress: string;
  aptSuite: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CheckoutPayload = {
  items: { variantId: string; quantity: number }[];
  customer: CheckoutCustomer;
  address: CheckoutAddress;
  saveAddress: boolean;
  shippingServiceCode?: string;
};
