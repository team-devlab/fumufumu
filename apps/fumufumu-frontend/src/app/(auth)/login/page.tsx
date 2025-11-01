import Link from 'next/link';

export default function LoginPage() {
	return (
		<div className="text-center">
			<h1 className="text-3xl font-bold text-gray-800 mb-6">ログイン</h1>
			<form className="space-y-4">
				<div>
					<input
						type="email"
						placeholder="メールアドレス"
						className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<input
						type="password"
						placeholder="パスワード"
						className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<button
					type="submit"
					className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
				>
					ログイン
				</button>
			</form>
			<p className="mt-6 text-sm text-gray-500">
				アカウントをお持ちでないですか？{' '}
				<Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
					サインアップ
				</Link>
			</p>
		</div>
	);
}
