TAGS_URL = "/api/v1/tags"


class TestListTags:
    def test_empty_for_new_user(self, client, auth_headers):
        response = client.get(TAGS_URL, headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_sorted_and_unique(self, client, auth_headers, user, post_factory):
        post_factory(user, tags=("zebra", "alpha"))
        post_factory(user, tags=("alpha", "midway"))
        names = [t["name"] for t in client.get(TAGS_URL, headers=auth_headers).json()]
        assert names == ["alpha", "midway", "zebra"]

    def test_users_do_not_see_each_others_tags(
        self, client, auth_headers, user, other_user, post_factory
    ):
        post_factory(user, tags=("mine",))
        post_factory(other_user, tags=("theirs",))
        names = [t["name"] for t in client.get(TAGS_URL, headers=auth_headers).json()]
        assert names == ["mine"]

    def test_requires_auth(self, client):
        assert client.get(TAGS_URL).status_code == 401
