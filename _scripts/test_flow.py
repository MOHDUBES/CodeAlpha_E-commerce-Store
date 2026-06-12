import urllib.request, json

API = "http://localhost:3000/api"

def make_request(method, endpoint, data=None, headers=None):
    if headers is None: headers = {}
    headers['Content-Type'] = 'application/json'
    
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(API + endpoint, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error_status": e.code, "error": e.read().decode()}

print("--- Testing Flow ---")

# 1. Register User
print("\n1. Registering User...")
user_data = make_request('POST', '/auth/register', {'name': 'Auto Tester', 'email': 'auto@test.com', 'password': 'password123'})
if 'error_status' in user_data and 'already exists' not in user_data.get('error', ''):
    # Try login instead
    user_data = make_request('POST', '/auth/login', {'email': 'auto@test.com', 'password': 'password123'})

if 'token' not in user_data and 'user' not in user_data:
    print("Auth failed!", user_data)
else:
    token = user_data.get('token', 'fake-token')
    user_id = str(user_data.get('user', {}).get('id', 1))
    session_id = 'test-session-123'
    headers = {'x-user-id': user_id, 'Authorization': f'Bearer {token}'}
    print(f"Auth Success! User ID: {user_id}")

    # 2. Add to Cart
    print("\n2. Adding product 1 to Cart...")
    res = make_request('POST', '/cart/add', {'product_id': 1, 'quantity': 2, 'session_id': session_id}, headers)
    print("Add to cart res:", res)

    # 3. Add to Cart (another product)
    print("\n3. Adding product 2 to Cart...")
    res = make_request('POST', '/cart/add', {'product_id': 2, 'quantity': 1, 'session_id': session_id}, headers)
    print("Add to cart res:", res)

    # 4. View Cart
    print("\n4. Viewing Cart...")
    cart_items = make_request('GET', f'/cart?session_id={session_id}', headers=headers)
    print("Cart Items:", cart_items)

    # 5. Remove Product 2
    if len(cart_items) > 1:
        cart_item_id = cart_items[1]['id'] # This is the cart entry ID, not product ID
        print(f"\n5. Removing cart item {cart_item_id}...")
        res = make_request('DELETE', f'/cart/remove/{cart_item_id}', headers=headers)
        print("Remove res:", res)

    # 6. View Cart Again
    print("\n6. Viewing Cart Again...")
    cart_items = make_request('GET', f'/cart?session_id={session_id}', headers=headers)
    print("Cart Items:", cart_items)

    # 7. Checkout (Place Order)
    print("\n7. Placing Order...")
    if len(cart_items) > 0:
        order_payload = {
            'name': 'Auto Tester',
            'email': 'auto@test.com',
            'address': 'Testing Lane 42',
            'city': 'Testville',
            'payment_method': 'cod',
            'items': [{'product_id': item['product_id'], 'quantity': item['quantity']} for item in cart_items]
        }
        order_res = make_request('POST', '/orders', order_payload, headers=headers)
        print("Order Res:", order_res)
